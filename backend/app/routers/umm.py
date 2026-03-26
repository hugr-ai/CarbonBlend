"""UMM (Urgent Market Messages) API endpoints."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any

from app.services.umm_client import fetch_umm_feed

router = APIRouter(prefix="/api/umm", tags=["umm"])


class UMMEvent(BaseModel):
    title: str
    summary: str
    event_type: str
    facility: str | None = None
    capacity_reduction_pct: float | None = None
    start_date: str | None = None
    end_date: str | None = None
    published: str | None = None
    link: str | None = None


class CapacityStatus(BaseModel):
    facility: str
    event_count: int
    active_reductions: list[UMMEvent]
    total_capacity_impact_pct: float | None = None


@router.get("", response_model=list[UMMEvent])
def list_umm_events() -> list[UMMEvent]:
    """Fetch current UMM events from Gassco."""
    events = fetch_umm_feed()
    return [UMMEvent(**e) for e in events]


@router.get("/capacity-status", response_model=list[CapacityStatus])
def get_capacity_status() -> list[CapacityStatus]:
    """Get aggregated capacity status per facility/pipeline from active UMM events."""
    events = fetch_umm_feed()

    # Group by facility
    facility_events: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        fac = event.get("facility")
        if fac:
            facility_events.setdefault(fac, []).append(event)

    statuses: list[CapacityStatus] = []
    for fac_name, fac_events in sorted(facility_events.items()):
        total_impact = None
        reductions = [e for e in fac_events if e.get("capacity_reduction_pct")]
        if reductions:
            total_impact = max(
                e["capacity_reduction_pct"] for e in reductions
            )

        statuses.append(
            CapacityStatus(
                facility=fac_name,
                event_count=len(fac_events),
                active_reductions=[UMMEvent(**e) for e in fac_events],
                total_capacity_impact_pct=total_impact,
            )
        )

    return statuses
