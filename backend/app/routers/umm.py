"""UMM (Urgent Market Messages) API endpoints."""

from __future__ import annotations

from datetime import datetime
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
    status: str  # "green", "amber", "red"
    event_count: int
    active_reductions: list[UMMEvent]
    total_capacity_impact_pct: float | None = None
    has_active_event: bool = False


@router.get("", response_model=list[UMMEvent])
def list_umm_events() -> list[UMMEvent]:
    """Fetch current UMM events from Gassco (live feed or mock fallback)."""
    events = fetch_umm_feed()
    return [UMMEvent(**e) for e in events]


@router.get("/capacity-status", response_model=list[CapacityStatus])
def get_capacity_status() -> list[CapacityStatus]:
    """Get aggregated capacity status per facility/pipeline from active UMM events.

    Returns a traffic-light status for each facility:
    - green: no active events or capacity impact
    - amber: active event with < 25% capacity reduction
    - red: active event with >= 25% capacity reduction or unplanned outage
    """
    events = fetch_umm_feed()
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Group by facility
    facility_events: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        fac = event.get("facility")
        if fac:
            facility_events.setdefault(fac, []).append(event)

    # All known facilities (including those with no events)
    all_facilities = [
        "Kollsnes", "Nyhamna", "Kårstø", "Sleipner", "Troll",
        "Langeled", "Europipe", "Franpipe", "Zeepipe", "Norpipe",
        "Statpipe", "Åsgard Transport", "Polarled", "Oseberg",
        "Draupner", "Heimdal",
    ]

    # Include any facility that has events but isn't in the default list
    for fac in facility_events:
        if fac not in all_facilities:
            all_facilities.append(fac)

    statuses: list[CapacityStatus] = []
    for fac_name in sorted(all_facilities):
        fac_events = facility_events.get(fac_name, [])

        # Determine active events (start_date <= today <= end_date or end_date is null)
        active_events = []
        for evt in fac_events:
            start = evt.get("start_date")
            end = evt.get("end_date")
            is_active = False
            if start and start <= today:
                if not end or end >= today:
                    is_active = True
            if is_active:
                active_events.append(evt)

        # Determine status
        total_impact = None
        has_active = len(active_events) > 0

        if has_active:
            reductions = [
                e for e in active_events if e.get("capacity_reduction_pct")
            ]
            if reductions:
                total_impact = max(
                    e["capacity_reduction_pct"] for e in reductions
                )

        # Traffic light logic
        if not has_active:
            status = "green"
        elif total_impact is not None and total_impact >= 25:
            status = "red"
        elif total_impact is not None and total_impact > 0:
            status = "amber"
        elif any(e.get("event_type") == "unplanned_outage" for e in active_events):
            status = "red"
        else:
            status = "amber"

        statuses.append(
            CapacityStatus(
                facility=fac_name,
                status=status,
                event_count=len(fac_events),
                active_reductions=[UMMEvent(**e) for e in active_events],
                total_capacity_impact_pct=total_impact,
                has_active_event=has_active,
            )
        )

    return statuses
