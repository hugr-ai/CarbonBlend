"""Optimization engine for finding best gas transport pathways."""

from __future__ import annotations

import logging
from typing import Any

import networkx as nx
from sqlalchemy.orm import Session

from app.models.co2_spec import CO2Spec
from app.models.export_terminal import ExportTerminal
from app.models.processing_option import ProcessingOption
from app.services.co2_blending import required_removal, calculate_blend
from app.services.tariff_calculator import get_tariff_for_segment

logger = logging.getLogger(__name__)

# Default CO2 entry spec for Gassled (mol%)
DEFAULT_CO2_LIMIT = 2.5

# Approximate conversion: 1 MSm3/d gas over 365 days
DAYS_PER_YEAR = 365


def optimize_existing(
    source_field_npdid: int,
    gas_flow_rate: float,
    co2_mol_pct: float,
    network: nx.DiGraph,
    db: Session,
    constraints: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Find best pathways using existing infrastructure only.

    Enumerates paths from source field to each export terminal.
    For each path, calculates CO2 removal needed, tariff cost, and total annual cost.
    Ranks pathways by total annual cost.

    Args:
        source_field_npdid: NPDID of the source field.
        gas_flow_rate: Gas flow rate in MSm3/d.
        co2_mol_pct: CO2 concentration at wellhead (mol%).
        network: Infrastructure graph.
        db: Database session.
        constraints: Optional constraints dict.

    Returns:
        Dict with ranked pathways, each containing route, costs, and feasibility.
    """
    source_node = f"field_{source_field_npdid}"
    if source_node not in network:
        return {
            "status": "error",
            "message": f"Field {source_field_npdid} not found in network",
            "pathways": [],
        }

    constraints = constraints or {}
    co2_target = constraints.get("co2_target_mol_pct", DEFAULT_CO2_LIMIT)

    # Find all terminal nodes
    terminal_nodes = [
        n for n, d in network.nodes(data=True)
        if d.get("node_type") == "export_terminal"
    ]

    # Get processing options for CO2 removal costing
    proc_options = db.query(ProcessingOption).all()
    cheapest_option = min(proc_options, key=lambda p: p.opex_per_tonne) if proc_options else None

    pathways: list[dict[str, Any]] = []

    for terminal_node in terminal_nodes:
        try:
            # Enumerate simple paths (limit to avoid combinatorial explosion)
            all_paths = list(
                nx.all_simple_paths(
                    network, source_node, terminal_node, cutoff=10
                )
            )
        except nx.NetworkXError:
            continue

        if not all_paths:
            continue

        terminal_data = network.nodes[terminal_node]

        for path in all_paths[:5]:  # Limit to top 5 paths per terminal
            pathway = _evaluate_pathway(
                path=path,
                network=network,
                gas_flow_rate=gas_flow_rate,
                co2_mol_pct=co2_mol_pct,
                co2_target=co2_target,
                terminal_data=terminal_data,
                cheapest_option=cheapest_option,
                db=db,
            )
            pathways.append(pathway)

    # Rank by total annual cost (ascending)
    pathways.sort(key=lambda p: p.get("total_annual_cost_mnok", float("inf")))

    return {
        "status": "ok",
        "source_field_npdid": source_field_npdid,
        "gas_flow_rate_mscm_d": gas_flow_rate,
        "co2_mol_pct": co2_mol_pct,
        "co2_target_mol_pct": co2_target,
        "num_pathways": len(pathways),
        "pathways": pathways,
    }


def optimize_with_bridges(
    source_field_npdid: int,
    gas_flow_rate: float,
    co2_mol_pct: float,
    network: nx.DiGraph,
    db: Session,
    constraints: dict[str, Any] | None = None,
    bridge_options: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Same as optimize_existing but with augmented network including virtual bridge edges.

    Bridge options represent potential new infrastructure (pipelines, tie-backs)
    that could create new pathways.

    Args:
        source_field_npdid: NPDID of the source field.
        gas_flow_rate: Gas flow rate in MSm3/d.
        co2_mol_pct: CO2 concentration at wellhead (mol%).
        network: Infrastructure graph.
        db: Database session.
        constraints: Optional constraints dict.
        bridge_options: List of potential bridge connections.

    Returns:
        Dict with ranked pathways including bridge-enabled routes,
        and comparison against existing-only optimization.
    """
    # First run existing-only
    existing_result = optimize_existing(
        source_field_npdid, gas_flow_rate, co2_mol_pct, network, db, constraints
    )

    # Build augmented network
    augmented = _build_augmented_network(network, source_field_npdid, db, bridge_options)

    # Run optimization on augmented network
    augmented_result = optimize_existing(
        source_field_npdid, gas_flow_rate, co2_mol_pct, augmented, db, constraints
    )

    # Compare
    existing_best_cost = (
        existing_result["pathways"][0]["total_annual_cost_mnok"]
        if existing_result["pathways"]
        else float("inf")
    )
    augmented_best_cost = (
        augmented_result["pathways"][0]["total_annual_cost_mnok"]
        if augmented_result["pathways"]
        else float("inf")
    )

    bridge_value = existing_best_cost - augmented_best_cost

    return {
        "status": "ok",
        "existing_best_cost_mnok": existing_best_cost,
        "augmented_best_cost_mnok": augmented_best_cost,
        "bridge_value_mnok": round(bridge_value, 2),
        "existing_pathways": existing_result["pathways"],
        "augmented_pathways": augmented_result["pathways"],
    }


def _build_augmented_network(
    network: nx.DiGraph,
    source_field_npdid: int,
    db: Session,
    bridge_options: list[dict[str, Any]] | None = None,
) -> nx.DiGraph:
    """Add virtual edges for potential new infrastructure.

    Creates a copy of the network and adds bridge edges.
    """
    augmented = network.copy()

    if not bridge_options:
        bridge_options = []

    for bridge in bridge_options:
        from_node = bridge.get("from_node")
        to_node = bridge.get("to_node")
        if from_node and to_node and augmented.has_node(from_node) and augmented.has_node(to_node):
            augmented.add_edge(
                from_node,
                to_node,
                edge_type="bridge",
                label=bridge.get("name", "Virtual bridge"),
                diameter_inches=bridge.get("diameter_inches"),
                co2_limit=bridge.get("co2_limit", DEFAULT_CO2_LIMIT),
                bridge_capex_mnok=bridge.get("capex_mnok", 0),
                tariff_nok_sm3=bridge.get("tariff_nok_sm3", 0),
            )

    return augmented


def _evaluate_pathway(
    path: list[str],
    network: nx.DiGraph,
    gas_flow_rate: float,
    co2_mol_pct: float,
    co2_target: float,
    terminal_data: dict[str, Any],
    cheapest_option: Any | None,
    db: Session,
) -> dict[str, Any]:
    """Evaluate a single pathway for cost and feasibility."""
    route_nodes = []
    route_edges = []
    total_tariff = 0.0
    has_processing = False
    has_bridge = False
    bridge_capex = 0.0

    for i, node_id in enumerate(path):
        node_data = network.nodes[node_id]
        route_nodes.append(
            {
                "id": node_id,
                "label": node_data.get("label", node_id),
                "type": node_data.get("node_type", "unknown"),
            }
        )

        if node_data.get("node_type") == "processing_plant":
            has_processing = True

        if i > 0:
            prev = path[i - 1]
            edge_data = network.edges.get((prev, node_id), {})
            tariff = edge_data.get("tariff_nok_sm3") or 0.0
            total_tariff += tariff

            if edge_data.get("edge_type") == "bridge":
                has_bridge = True
                bridge_capex += edge_data.get("bridge_capex_mnok", 0.0)

            route_edges.append(
                {
                    "from": prev,
                    "to": node_id,
                    "label": edge_data.get("label", ""),
                    "type": edge_data.get("edge_type", ""),
                    "tariff_nok_sm3": tariff,
                }
            )

    # CO2 removal cost
    removal = required_removal(co2_mol_pct, co2_target, gas_flow_rate)
    co2_removal_cost_per_year = 0.0
    if removal["requires_removal"] and cheapest_option:
        # tonnes/day * 365 days * USD/tonne
        co2_removal_cost_per_year = (
            removal["co2_mass_rate_tonnes_per_day"]
            * DAYS_PER_YEAR
            * cheapest_option.opex_per_tonne
        )
        # Convert USD to NOK (approximate: 1 USD ~ 10.5 NOK)
        co2_removal_cost_per_year *= 10.5

    # Annual tariff cost: flow_rate MSm3/d * 1e6 Sm3 * 365 d * tariff NOK/Sm3
    annual_tariff_nok = gas_flow_rate * 1e6 * DAYS_PER_YEAR * total_tariff
    annual_tariff_mnok = annual_tariff_nok / 1e6

    # Total annual cost in MNOK
    total_annual_mnok = annual_tariff_mnok + co2_removal_cost_per_year / 1e6

    # Add bridge CAPEX amortized over 25 years
    if has_bridge and bridge_capex > 0:
        total_annual_mnok += bridge_capex / 25.0

    return {
        "terminal": terminal_data.get("label", "Unknown"),
        "terminal_country": terminal_data.get("country"),
        "hub_name": terminal_data.get("hub_name"),
        "route_nodes": route_nodes,
        "route_edges": route_edges,
        "num_hops": len(path) - 1,
        "total_tariff_nok_sm3": round(total_tariff, 6),
        "annual_tariff_mnok": round(annual_tariff_mnok, 2),
        "co2_removal": removal,
        "co2_removal_cost_mnok_yr": round(co2_removal_cost_per_year / 1e6, 2),
        "has_processing_plant": has_processing,
        "has_bridge": has_bridge,
        "bridge_capex_mnok": round(bridge_capex, 2),
        "total_annual_cost_mnok": round(total_annual_mnok, 2),
        "market_price": terminal_data.get("default_price"),
        "currency": terminal_data.get("currency"),
    }
