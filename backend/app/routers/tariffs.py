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
    flow_rate_mscm_d: float | None = None


class SegmentCost(BaseModel):
    pipeline_segment: str
    baa: str | None = None
    k_element: float | None = None
    u_element: float | None = None
    i_element: float | None = None
    o_element: float | None = None
    unit_tariff_nok_sm3: float
    cumulative_tariff_nok_sm3: float = 0.0
    year: int | None = None


class RouteCostResponse(BaseModel):
    segments: list[SegmentCost]
    missing_segments: list[str]
    total_k_element: float
    total_u_element: float
    total_i_element: float
    total_o_element: float
    total_tariff_nok_sm3: float
    annualized_cost_mnok: float | None = None
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
    """Calculate total tariff for a pipeline route.

    Accepts a list of pipeline segment names (in order) and optionally a
    flow rate to compute annualized cost. Returns per-segment K, U, I, O
    elements with cumulative totals at each step.
    """
    result = calculate_route_tariff(request.route_segments, db)

    # Add cumulative tariff at each step
    cumulative = 0.0
    segments_with_cumulative: list[dict[str, Any]] = []
    for seg in result["segments"]:
        cumulative += seg.get("unit_tariff_nok_sm3", 0)
        segments_with_cumulative.append({
            **seg,
            "cumulative_tariff_nok_sm3": round(cumulative, 6),
        })

    # Compute annualized cost if flow rate provided
    annualized_cost_mnok: float | None = None
    if request.flow_rate_mscm_d is not None and request.flow_rate_mscm_d > 0:
        total_tariff = result["total_tariff_nok_sm3"]
        # MNOK/yr = tariff (NOK/Sm3) * flow (MSm3/d) * 365 days * 1e6 Sm3/MSm3 / 1e6 NOK/MNOK
        annualized_cost_mnok = round(total_tariff * request.flow_rate_mscm_d * 365, 2)

    return RouteCostResponse(
        segments=[SegmentCost(**s) for s in segments_with_cumulative],
        missing_segments=result["missing_segments"],
        total_k_element=result["total_k_element"],
        total_u_element=result["total_u_element"],
        total_i_element=result["total_i_element"],
        total_o_element=result["total_o_element"],
        total_tariff_nok_sm3=result["total_tariff_nok_sm3"],
        annualized_cost_mnok=annualized_cost_mnok,
        num_segments=result["num_segments"],
    )
