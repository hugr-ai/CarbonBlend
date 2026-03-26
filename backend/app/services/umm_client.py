"""Client for fetching UMM (Urgent Market Messages) from Gassco."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import feedparser

from app.config import settings

logger = logging.getLogger(__name__)


def fetch_umm_feed() -> list[dict[str, Any]]:
    """Fetch and parse the UMM Atom feed from Gassco.

    Returns:
        List of UMM events with event_type, facility, capacity_reduction,
        start_date, end_date, title, summary.
    """
    try:
        feed = feedparser.parse(settings.umm_feed_url)
    except Exception as exc:
        logger.error("Failed to fetch UMM feed: %s", exc)
        return []

    events: list[dict[str, Any]] = []

    for entry in feed.entries:
        title = getattr(entry, "title", "")
        summary = getattr(entry, "summary", "")
        published = getattr(entry, "published", "")
        link = getattr(entry, "link", "")

        # Parse structured info from title/summary
        event_type = _classify_event(title, summary)
        facility = _extract_facility(title, summary)
        capacity_reduction = _extract_capacity(summary)
        start_date, end_date = _extract_dates(summary, published)

        events.append(
            {
                "title": title,
                "summary": summary,
                "event_type": event_type,
                "facility": facility,
                "capacity_reduction_pct": capacity_reduction,
                "start_date": start_date,
                "end_date": end_date,
                "published": published,
                "link": link,
            }
        )

    logger.info("Parsed %d UMM events", len(events))
    return events


def _classify_event(title: str, summary: str) -> str:
    """Classify UMM event type from title and summary text."""
    text = (title + " " + summary).lower()
    if "planned" in text or "maintenance" in text:
        return "planned_maintenance"
    if "unplanned" in text or "outage" in text or "force majeure" in text:
        return "unplanned_outage"
    if "capacity" in text and ("reduction" in text or "limitation" in text):
        return "capacity_reduction"
    if "restart" in text or "return" in text or "resume" in text:
        return "restart"
    return "other"


def _extract_facility(title: str, summary: str) -> str | None:
    """Attempt to extract facility/pipeline name from UMM text."""
    # Common NCS infrastructure names to search for
    known_facilities = [
        "Langeled", "Europipe", "Franpipe", "Zeepipe", "Norpipe",
        "Statpipe", "Åsgard Transport", "Polarled", "Kårstø",
        "Kollsnes", "Nyhamna", "Sleipner", "Troll", "Oseberg",
        "Draupner", "Heimdal",
    ]
    text = title + " " + summary
    for name in known_facilities:
        if name.lower() in text.lower():
            return name
    return None


def _extract_capacity(summary: str) -> float | None:
    """Try to extract capacity reduction percentage from summary text."""
    import re

    # Look for patterns like "50%" or "50 %" or "capacity reduced by 50%"
    match = re.search(r"(\d+(?:\.\d+)?)\s*%", summary)
    if match:
        return float(match.group(1))
    return None


def _extract_dates(summary: str, published: str) -> tuple[str | None, str | None]:
    """Try to extract start and end dates from UMM summary."""
    import re

    # ISO date patterns
    dates = re.findall(r"\d{4}-\d{2}-\d{2}", summary)
    start = dates[0] if len(dates) >= 1 else published[:10] if published else None
    end = dates[1] if len(dates) >= 2 else None
    return start, end
