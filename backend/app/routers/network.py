"""Network graph API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.services.network_builder import (
    build_key_network,
    build_network,
    get_subgraph,
    get_react_flow_data,
    trace_paths_to_terminals,
)
from app.services.hub_balance import compute_hub_balance

router = APIRouter(prefix="/api/network", tags=["network"])


class ReactFlowNode(BaseModel):
    id: str
    type: str
    data: dict[str, Any]
    position: dict[str, float]


class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""
    data: dict[str, Any] = {}
    animated: bool = False


class NetworkOut(BaseModel):
    nodes: list[ReactFlowNode]
    edges: list[ReactFlowEdge]
    node_count: int
    edge_count: int


@router.get("", response_model=NetworkOut)
def get_default_network(db: Session = Depends(get_db)) -> NetworkOut:
    """Get the key infrastructure network (default view).

    Returns a curated view showing fields with CO2 data, major hubs,
    processing plants, and export terminals with geographic positioning.
    """
    graph = build_key_network(db)
    data = get_react_flow_data(graph)
    return NetworkOut(
        nodes=data["nodes"],
        edges=data["edges"],
        node_count=len(data["nodes"]),
        edge_count=len(data["edges"]),
    )


@router.get("/key", response_model=NetworkOut)
def get_key_network(db: Session = Depends(get_db)) -> NetworkOut:
    """Get the key infrastructure network (explicit endpoint).

    Same as the default GET /api/network -- returns curated key infrastructure.
    """
    graph = build_key_network(db)
    data = get_react_flow_data(graph)
    return NetworkOut(
        nodes=data["nodes"],
        edges=data["edges"],
        node_count=len(data["nodes"]),
        edge_count=len(data["edges"]),
    )


@router.get("/full", response_model=NetworkOut)
def get_full_network(db: Session = Depends(get_db)) -> NetworkOut:
    """Get the complete (unfiltered) infrastructure network.

    Returns all connected facilities, fields, plants, and terminals.
    This may include hundreds of nodes.
    """
    graph = build_network(db)
    data = get_react_flow_data(graph)
    return NetworkOut(
        nodes=data["nodes"],
        edges=data["edges"],
        node_count=len(data["nodes"]),
        edge_count=len(data["edges"]),
    )


class HubFlowStream(BaseModel):
    source: str | None = None
    destination: str | None = None
    type: str
    co2_mol_pct: float | None = None
    flow_mscm_d: float | None = None
    pipeline: str | None = None


class HubBalanceOut(BaseModel):
    hub_name: str
    npdid: int
    inputs: list[HubFlowStream]
    outputs: list[HubFlowStream]
    blended_co2_mol_pct: float | None = None
    total_input_mscm_d: float
    total_output_mscm_d: float
    co2_removal_at_hub: bool


@router.get("/hub-balance/{facility_npdid}", response_model=HubBalanceOut)
def get_hub_balance(
    facility_npdid: int,
    db: Session = Depends(get_db),
) -> HubBalanceOut:
    """Get the flow balance (inputs/outputs) for a hub facility."""
    result = compute_hub_balance(facility_npdid, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Hub facility not found")
    return HubBalanceOut(**result)


class PathToTerminalOut(BaseModel):
    node_ids: list[str]
    node_labels: list[str]
    terminal_name: str
    total_tariff_nok_sm3: float
    co2_at_entry: float | None = None
    co2_at_exit: float | None = None
    path_length: int
    pipelines: list[str]


@router.get("/paths/{field_npdid}", response_model=list[PathToTerminalOut])
def get_paths_to_terminals(
    field_npdid: int,
    db: Session = Depends(get_db),
) -> list[PathToTerminalOut]:
    """Get all viable paths from a field to every reachable export terminal.

    Returns paths sorted by total tariff (cheapest first), with CO2 tracking
    and pipeline names along each route.
    """
    graph = build_network(db)
    paths = trace_paths_to_terminals(graph, field_npdid)
    return [PathToTerminalOut(**p) for p in paths]


@router.get("/subgraph/{field_npdid}", response_model=NetworkOut)
def get_field_subgraph(
    field_npdid: int,
    depth: int = Query(5, ge=1, le=10, description="BFS depth from field node"),
    db: Session = Depends(get_db),
) -> NetworkOut:
    """Get a subgraph centred on a specific field.

    Follows connections through facilities and pipelines up to the given depth.
    Always tries to include reachable processing plants and terminals.
    Nodes on a viable export path are annotated with path_to_terminal=True.
    """
    graph = build_network(db)
    sub = get_subgraph(graph, field_npdid, depth=depth)
    data = get_react_flow_data(sub)
    return NetworkOut(
        nodes=data["nodes"],
        edges=data["edges"],
        node_count=len(data["nodes"]),
        edge_count=len(data["edges"]),
    )
