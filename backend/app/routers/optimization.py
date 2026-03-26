"""Optimization API endpoints."""

from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.network_builder import build_network
from app.services.optimizer import optimize_existing, optimize_with_bridges

router = APIRouter(prefix="/api", tags=["optimization"])


# --- Schemas ---

class OptimizeRequest(BaseModel):
    source_field_npdid: int
    gas_flow_rate_mscm_d: float
    co2_mol_pct: float
    co2_target_mol_pct: float = 2.5
    constraints: dict[str, Any] | None = None


class BridgeOption(BaseModel):
    from_node: str
    to_node: str
    name: str = "Virtual bridge"
    diameter_inches: float | None = None
    co2_limit: float = 2.5
    capex_mnok: float = 0.0
    tariff_nok_sm3: float = 0.0


class BridgeOptimizeRequest(BaseModel):
    source_field_npdid: int
    gas_flow_rate_mscm_d: float
    co2_mol_pct: float
    co2_target_mol_pct: float = 2.5
    bridge_options: list[BridgeOption] = []
    constraints: dict[str, Any] | None = None


class PathwayNode(BaseModel):
    id: str
    label: str
    type: str


class PathwayEdge(BaseModel):
    source: str  # 'from' is reserved
    target: str  # 'to' is reserved
    label: str = ""
    type: str = ""
    tariff_nok_sm3: float = 0.0


class CO2Removal(BaseModel):
    co2_to_remove_mol_pct: float
    co2_removal_fraction: float
    co2_mass_rate_tonnes_per_day: float
    requires_removal: bool


class Pathway(BaseModel):
    terminal: str
    terminal_country: str | None = None
    hub_name: str | None = None
    route_nodes: list[PathwayNode]
    route_edges: list[PathwayEdge]
    num_hops: int
    total_tariff_nok_sm3: float
    annual_tariff_mnok: float
    co2_removal: CO2Removal
    co2_removal_cost_mnok_yr: float
    has_processing_plant: bool
    has_bridge: bool
    bridge_capex_mnok: float
    total_annual_cost_mnok: float
    market_price: float | None = None
    currency: str | None = None


class OptimizeResponse(BaseModel):
    status: str
    source_field_npdid: int | None = None
    gas_flow_rate_mscm_d: float | None = None
    co2_mol_pct: float | None = None
    co2_target_mol_pct: float | None = None
    num_pathways: int = 0
    pathways: list[Pathway] = []
    message: str | None = None


class BridgeOptimizeResponse(BaseModel):
    status: str
    existing_best_cost_mnok: float
    augmented_best_cost_mnok: float
    bridge_value_mnok: float
    existing_pathways: list[Pathway] = []
    augmented_pathways: list[Pathway] = []


# Sync in-memory result store (fine for MVP)
_results: dict[str, dict[str, Any]] = {}


@router.post("/optimize", response_model=dict[str, Any])
def run_optimization(
    request: OptimizeRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Run pathway optimization.

    For MVP, this runs synchronously and returns a job_id with the result.
    """
    job_id = str(uuid.uuid4())

    network = build_network(db)
    constraints = request.constraints or {}
    constraints["co2_target_mol_pct"] = request.co2_target_mol_pct

    result = optimize_existing(
        source_field_npdid=request.source_field_npdid,
        gas_flow_rate=request.gas_flow_rate_mscm_d,
        co2_mol_pct=request.co2_mol_pct,
        network=network,
        db=db,
        constraints=constraints,
    )

    _results[job_id] = result
    return {"job_id": job_id, **result}


@router.get("/optimize/{job_id}/result", response_model=dict[str, Any])
def get_optimization_result(job_id: str) -> dict[str, Any]:
    """Get optimization result by job ID."""
    if job_id not in _results:
        raise HTTPException(status_code=404, detail="Job not found")
    return _results[job_id]


@router.post("/optimize/bridges", response_model=dict[str, Any])
def run_bridge_optimization(
    request: BridgeOptimizeRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Run optimization with bridge infrastructure options."""
    network = build_network(db)
    constraints = request.constraints or {}
    constraints["co2_target_mol_pct"] = request.co2_target_mol_pct

    bridge_opts = [b.model_dump() for b in request.bridge_options]

    result = optimize_with_bridges(
        source_field_npdid=request.source_field_npdid,
        gas_flow_rate=request.gas_flow_rate_mscm_d,
        co2_mol_pct=request.co2_mol_pct,
        network=network,
        db=db,
        constraints=constraints,
        bridge_options=bridge_opts,
    )
    return result


@router.get("/bridges", response_model=list[dict[str, Any]])
def list_bridge_opportunities(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """List potential bridge infrastructure opportunities.

    Identifies gaps in the network where new connections could add value.
    """
    network = build_network(db)

    # Find field nodes with high CO2 that lack direct pipeline connections to terminals
    opportunities: list[dict[str, Any]] = []

    from app.models.co2_spec import CO2Spec

    high_co2_fields = (
        db.query(CO2Spec)
        .filter(CO2Spec.entity_type == "field", CO2Spec.co2_mol_pct > 2.5)
        .all()
    )

    for spec in high_co2_fields:
        field_node = None
        for node, data in network.nodes(data=True):
            if (
                data.get("node_type") == "field"
                and data.get("label", "").upper() == spec.entity_name.upper()
            ):
                field_node = node
                break

        if field_node is None:
            continue

        # Check connectivity to terminals
        terminal_nodes = [
            n for n, d in network.nodes(data=True)
            if d.get("node_type") == "export_terminal"
        ]

        connected_terminals = []
        for term in terminal_nodes:
            if nx_has_path(network, field_node, term):
                connected_terminals.append(term)

        if len(connected_terminals) < 2:
            opportunities.append(
                {
                    "field": spec.entity_name,
                    "co2_mol_pct": spec.co2_mol_pct,
                    "connected_terminals": len(connected_terminals),
                    "suggestion": "Consider bridge connection to additional export routes",
                }
            )

    return opportunities


def nx_has_path(graph, source, target) -> bool:
    """Check if path exists between two nodes."""
    import networkx as nx
    try:
        return nx.has_path(graph, source, target)
    except nx.NodeNotFound:
        return False
