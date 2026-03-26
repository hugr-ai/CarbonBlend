"""Network graph API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.services.network_builder import (
    build_key_network,
    build_network,
    get_subgraph,
    get_react_flow_data,
)

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
