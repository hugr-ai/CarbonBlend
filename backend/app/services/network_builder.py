"""Build a NetworkX graph of the NCS gas infrastructure."""

from __future__ import annotations

import json
import logging
from typing import Any

import networkx as nx
from sqlalchemy.orm import Session

from app.models.facility import Facility
from app.models.field import Field
from app.models.pipeline import Pipeline
from app.models.processing_plant import ProcessingPlant
from app.models.export_terminal import ExportTerminal
from app.models.tariff import Tariff

logger = logging.getLogger(__name__)


def build_network(db: Session) -> nx.DiGraph:
    """Build a directed graph of the NCS gas transport infrastructure.

    Nodes represent: fields, facilities, processing plants, export terminals.
    Edges represent: pipelines, field-to-facility connections, plant-to-terminal links.

    Edge attributes include diameter, medium, co2_limit, tariff where available.
    """
    G = nx.DiGraph()

    # --- Add facility nodes ---
    facilities = db.query(Facility).all()
    facility_by_name: dict[str, Facility] = {}
    for fac in facilities:
        node_id = f"facility_{fac.npdid_facility}"
        G.add_node(
            node_id,
            label=fac.name,
            node_type="facility",
            kind=fac.kind,
            phase=fac.phase,
            operator=fac.operator,
            npdid=fac.npdid_facility,
            lat=fac.lat,
            lon=fac.lon,
        )
        facility_by_name[fac.name] = fac

    # --- Add field nodes and connect to primary facilities ---
    fields = db.query(Field).all()
    for field in fields:
        node_id = f"field_{field.npdid_field}"
        G.add_node(
            node_id,
            label=field.name,
            node_type="field",
            main_area=field.main_area,
            status=field.status,
            hc_type=field.hc_type,
            operator=field.operator,
            npdid=field.npdid_field,
            lat=field.lat,
            lon=field.lon,
        )
        # Connect field to facilities that belong to it
        for fac in facilities:
            if (
                fac.belongs_to_name
                and fac.belongs_to_name.upper() == field.name.upper()
            ):
                G.add_edge(
                    node_id,
                    f"facility_{fac.npdid_facility}",
                    edge_type="field_to_facility",
                    label=f"{field.name} -> {fac.name}",
                )

    # --- Add pipeline edges between facilities ---
    pipelines = db.query(Pipeline).all()
    for pipe in pipelines:
        from_id = (
            f"facility_{pipe.from_facility_id}" if pipe.from_facility_id else None
        )
        to_id = f"facility_{pipe.to_facility_id}" if pipe.to_facility_id else None

        # If IDs not available, try matching by name
        if from_id is None and pipe.from_facility:
            matched = facility_by_name.get(pipe.from_facility)
            if matched:
                from_id = f"facility_{matched.npdid_facility}"
        if to_id is None and pipe.to_facility:
            matched = facility_by_name.get(pipe.to_facility)
            if matched:
                to_id = f"facility_{matched.npdid_facility}"

        if from_id and to_id and G.has_node(from_id) and G.has_node(to_id):
            # Look up tariff for this pipeline's grouping
            tariff_val = None
            if pipe.main_grouping:
                tariff = (
                    db.query(Tariff)
                    .filter(Tariff.pipeline_segment.ilike(f"%{pipe.main_grouping}%"))
                    .first()
                )
                if tariff:
                    tariff_val = tariff.unit_tariff_nok_sm3

            G.add_edge(
                from_id,
                to_id,
                edge_type="pipeline",
                label=pipe.name,
                npdid=pipe.npdid_pipeline,
                diameter_inches=pipe.diameter_inches,
                medium=pipe.medium,
                main_grouping=pipe.main_grouping,
                co2_limit=2.5,  # Default Gassled spec
                tariff_nok_sm3=tariff_val,
            )

    # --- Add processing plant nodes ---
    plants = db.query(ProcessingPlant).all()
    for plant in plants:
        node_id = f"plant_{plant.id}"
        source_fields = []
        if plant.source_fields:
            try:
                source_fields = json.loads(plant.source_fields)
            except (json.JSONDecodeError, TypeError):
                pass

        G.add_node(
            node_id,
            label=plant.name,
            node_type="processing_plant",
            capacity_mscm_d=plant.capacity_mscm_d,
            has_co2_removal=bool(plant.has_co2_removal),
            lat=plant.lat,
            lon=plant.lon,
        )
        # Connect plant to facilities that feed it (by name matching)
        for fac in facilities:
            if fac.name and plant.name and plant.name.upper() in fac.name.upper():
                G.add_edge(
                    f"facility_{fac.npdid_facility}",
                    node_id,
                    edge_type="facility_to_plant",
                    label=f"{fac.name} -> {plant.name}",
                )

    # --- Add export terminal nodes ---
    terminals = db.query(ExportTerminal).all()
    for term in terminals:
        node_id = f"terminal_{term.id}"
        G.add_node(
            node_id,
            label=term.name,
            node_type="export_terminal",
            country=term.country,
            hub_name=term.hub_name,
            default_price=term.default_price,
            currency=term.currency,
            co2_entry_spec_mol_pct=term.co2_entry_spec_mol_pct,
            lat=term.lat,
            lon=term.lon,
        )

    logger.info(
        "Built network with %d nodes and %d edges", G.number_of_nodes(), G.number_of_edges()
    )
    return G


def get_subgraph(
    graph: nx.DiGraph, field_npdid: int, depth: int = 4
) -> nx.DiGraph:
    """Extract a subgraph via BFS from a field node.

    Args:
        graph: Full infrastructure graph.
        field_npdid: NPDID of the source field.
        depth: Maximum BFS depth.

    Returns:
        Subgraph containing all nodes within `depth` hops of the field.
    """
    source_node = f"field_{field_npdid}"
    if source_node not in graph:
        return nx.DiGraph()

    # BFS forward (downstream)
    forward_nodes = set(
        nx.single_source_shortest_path_length(graph, source_node, cutoff=depth).keys()
    )
    # BFS backward (upstream) on reversed graph
    backward_nodes = set(
        nx.single_source_shortest_path_length(
            graph.reverse(), source_node, cutoff=depth
        ).keys()
    )

    all_nodes = forward_nodes | backward_nodes
    return graph.subgraph(all_nodes).copy()


def get_react_flow_data(graph: nx.DiGraph) -> dict[str, Any]:
    """Convert a NetworkX graph to React Flow compatible format.

    Returns:
        Dict with 'nodes' and 'edges' lists suitable for React Flow rendering.
    """
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    # Layout: assign positions based on node type
    type_x_offset = {
        "field": 0,
        "facility": 300,
        "processing_plant": 600,
        "export_terminal": 900,
    }

    type_counts: dict[str, int] = {}
    for node_id, data in graph.nodes(data=True):
        node_type = data.get("node_type", "unknown")
        count = type_counts.get(node_type, 0)
        type_counts[node_type] = count + 1

        x = type_x_offset.get(node_type, 450)
        y = count * 100

        nodes.append(
            {
                "id": node_id,
                "type": node_type,
                "data": {
                    "label": data.get("label", node_id),
                    **{k: v for k, v in data.items() if k != "label"},
                },
                "position": {"x": x, "y": y},
            }
        )

    for source, target, data in graph.edges(data=True):
        edge_id = f"{source}->{target}"
        edges.append(
            {
                "id": edge_id,
                "source": source,
                "target": target,
                "label": data.get("label", ""),
                "data": {k: v for k, v in data.items() if k != "label"},
                "animated": data.get("edge_type") == "pipeline",
            }
        )

    return {"nodes": nodes, "edges": edges}
