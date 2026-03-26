"""Tariff API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.models.tariff import Tariff
from app.services.tariff_calculator import calculate_route_tariff

router = APIRouter(prefix="/api/tariffs", tags=["tariffs"])


class TariffOut(BaseModel):
    id: int
    pipeline_segment: str
    baa: str | None = None
    k_element: float | None = None
    u_element: float | None = None
    i_element: float | None = None
    o_element: float | None = None
    unit_tariff_nok_sm3: float | None = None
    year: int | None = None

    class Config:
        from_attributes = True


class RouteCostRequest(BaseModel):
    route_segments: list[str]


class SegmentCost(BaseModel):
    pipeline_segment: str
    baa: str | None = None
    k_element: float | None = None
    u_element: float | None = None
    i_element: float | None = None
    o_element: float | None = None
    unit_tariff_nok_sm3: float
    year: int | None = None


class RouteCostResponse(BaseModel):
    segments: list[SegmentCost]
    missing_segments: list[str]
    total_k_element: float
    total_u_element: float
    total_i_element: float
    total_o_element: float
    total_tariff_nok_sm3: float
    num_segments: int


@router.get("", response_model=list[TariffOut])
def list_tariffs(db: Session = Depends(get_db)) -> list[TariffOut]:
    """List all tariff data."""
    tariffs = db.query(Tariff).order_by(Tariff.pipeline_segment).all()
    return [TariffOut.model_validate(t) for t in tariffs]


@router.post("/route-cost", response_model=RouteCostResponse)
def compute_route_cost(
    request: RouteCostRequest,
    db: Session = Depends(get_db),
) -> RouteCostResponse:
    """Calculate total tariff for a pipeline route."""
    result = calculate_route_tariff(request.route_segments, db)
    return RouteCostResponse(**result)
