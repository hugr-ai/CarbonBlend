"""Network graph API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.services.network_builder import build_network, get_subgraph, get_react_flow_data

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
def get_full_network(db: Session = Depends(get_db)) -> NetworkOut:
    """Get the full infrastructure network in React Flow format."""
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
    depth: int = Query(4, ge=1, le=10, description="BFS depth from field node"),
    db: Session = Depends(get_db),
) -> NetworkOut:
    """Get a subgraph centered on a specific field."""
    graph = build_network(db)
    sub = get_subgraph(graph, field_npdid, depth=depth)
    data = get_react_flow_data(sub)
    return NetworkOut(
        nodes=data["nodes"],
        edges=data["edges"],
        node_count=len(data["nodes"]),
        edge_count=len(data["edges"]),
    )
