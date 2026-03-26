"""Gassled tariff calculation for pipeline route costing."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.tariff import Tariff


def get_tariff_for_segment(segment_name: str, db: Session) -> dict[str, Any] | None:
    """Look up tariff elements for a single pipeline segment.

    Args:
        segment_name: Pipeline segment name (e.g. "Langeled", "Europipe II")
        db: SQLAlchemy session

    Returns:
        Dict with K, U, I, O elements and total, or None if not found.
    """
    tariff = (
        db.query(Tariff)
        .filter(Tariff.pipeline_segment.ilike(f"%{segment_name}%"))
        .first()
    )
    if tariff is None:
        return None

    total = (
        (tariff.k_element or 0.0)
        + (tariff.u_element or 0.0)
        + (tariff.i_element or 0.0)
        + (tariff.o_element or 0.0)
    )
    return {
        "pipeline_segment": tariff.pipeline_segment,
        "baa": tariff.baa,
        "k_element": tariff.k_element,
        "u_element": tariff.u_element,
        "i_element": tariff.i_element,
        "o_element": tariff.o_element,
        "unit_tariff_nok_sm3": round(total, 6),
        "year": tariff.year,
    }


def calculate_route_tariff(
    route_segments: list[str], db: Session
) -> dict[str, Any]:
    """Calculate total tariff for a pipeline route consisting of multiple segments.

    Args:
        route_segments: List of pipeline segment names forming the route.
        db: SQLAlchemy session

    Returns:
        Dict with segment breakdown, total tariff, and any missing segments.
    """
    segments: list[dict[str, Any]] = []
    missing: list[str] = []
    total_k = 0.0
    total_u = 0.0
    total_i = 0.0
    total_o = 0.0

    for seg_name in route_segments:
        tariff_data = get_tariff_for_segment(seg_name, db)
        if tariff_data is None:
            missing.append(seg_name)
            continue
        segments.append(tariff_data)
        total_k += tariff_data["k_element"] or 0.0
        total_u += tariff_data["u_element"] or 0.0
        total_i += tariff_data["i_element"] or 0.0
        total_o += tariff_data["o_element"] or 0.0

    total_tariff = total_k + total_u + total_i + total_o

    return {
        "segments": segments,
        "missing_segments": missing,
        "total_k_element": round(total_k, 6),
        "total_u_element": round(total_u, 6),
        "total_i_element": round(total_i, 6),
        "total_o_element": round(total_o, 6),
        "total_tariff_nok_sm3": round(total_tariff, 6),
        "num_segments": len(segments),
    }
