"""Client for fetching UMM (Urgent Market Messages) from Gassco."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


def fetch_umm_feed() -> list[dict[str, Any]]:
    """Fetch and parse the UMM Atom feed from Gassco.

    Tries the live feed first; falls back to realistic mock data if the feed
    is unavailable or returns no entries.

    Returns:
        List of UMM events with event_type, facility, capacity_reduction,
        start_date, end_date, title, summary.
    """
    events = _try_live_feed()
    if events:
        return events

    logger.info("Live UMM feed unavailable, using mock data")
    return _generate_mock_events()


def _try_live_feed() -> list[dict[str, Any]]:
    """Attempt to fetch the live Atom feed."""
    try:
        import feedparser  # noqa: F811

        feed = feedparser.parse(settings.umm_feed_url)
        if not feed.entries:
            return []

        events: list[dict[str, Any]] = []
        for entry in feed.entries:
            title = getattr(entry, "title", "")
            summary = getattr(entry, "summary", "")
            published = getattr(entry, "published", "")
            link = getattr(entry, "link", "")

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

        logger.info("Parsed %d live UMM events", len(events))
        return events
    except Exception as exc:
        logger.warning("Failed to fetch live UMM feed: %s", exc)
        return []


def _generate_mock_events() -> list[dict[str, Any]]:
    """Generate realistic mock UMM events based on known NCS maintenance patterns."""
    now = datetime.utcnow()
    events: list[dict[str, Any]] = []

    # Planned maintenance events (typical summer/autumn turnarounds)
    planned_events = [
        {
            "facility": "Kollsnes",
            "title": "Planned maintenance at Kollsnes processing plant",
            "summary": "Annual turnaround maintenance at Kollsnes gas processing plant. "
                       "Capacity reduced by 30% during maintenance period. "
                       f"From {(now + timedelta(days=14)).strftime('%Y-%m-%d')} "
                       f"to {(now + timedelta(days=28)).strftime('%Y-%m-%d')}.",
            "capacity_reduction_pct": 30.0,
            "days_from_now_start": 14,
            "days_from_now_end": 28,
        },
        {
            "facility": "Nyhamna",
            "title": "Planned maintenance at Nyhamna / Ormen Lange",
            "summary": "Scheduled compressor overhaul at Nyhamna gas processing facility. "
                       "Expected capacity reduction of 20%. "
                       f"From {(now + timedelta(days=45)).strftime('%Y-%m-%d')} "
                       f"to {(now + timedelta(days=52)).strftime('%Y-%m-%d')}.",
            "capacity_reduction_pct": 20.0,
            "days_from_now_start": 45,
            "days_from_now_end": 52,
        },
        {
            "facility": "Langeled",
            "title": "Planned inspection on Langeled pipeline",
            "summary": "Scheduled pipeline inspection using intelligent pigging. "
                       "Temporary capacity limitation of 15% on Langeled South. "
                       f"From {(now + timedelta(days=60)).strftime('%Y-%m-%d')} "
                       f"to {(now + timedelta(days=63)).strftime('%Y-%m-%d')}.",
            "capacity_reduction_pct": 15.0,
            "days_from_now_start": 60,
            "days_from_now_end": 63,
        },
    ]

    # Currently active events
    active_events = [
        {
            "facility": "Europipe",
            "title": "Capacity limitation on Europipe II",
            "summary": "Reduced nomination capacity on Europipe II due to compressor issues "
                       "at Draupner. Capacity reduced by 10%. "
                       f"From {(now - timedelta(days=3)).strftime('%Y-%m-%d')} "
                       f"until further notice.",
            "capacity_reduction_pct": 10.0,
            "days_from_now_start": -3,
            "days_from_now_end": 7,
        },
        {
            "facility": "Sleipner",
            "title": "Reduced processing at Sleipner T",
            "summary": "Unplanned reduction in processing capacity at Sleipner T platform "
                       "due to equipment fault. Capacity impact approximately 25%. "
                       f"Started {(now - timedelta(days=1)).strftime('%Y-%m-%d')}.",
            "capacity_reduction_pct": 25.0,
            "days_from_now_start": -1,
            "days_from_now_end": 5,
        },
    ]

    # Recently completed events
    recent_events = [
        {
            "facility": "Kårstø",
            "title": "Restart: Kårstø processing plant back to full capacity",
            "summary": "Kårstø gas processing plant has returned to full capacity "
                       "following completion of planned maintenance. "
                       f"Restarted {(now - timedelta(days=5)).strftime('%Y-%m-%d')}.",
            "capacity_reduction_pct": None,
            "days_from_now_start": -12,
            "days_from_now_end": -5,
        },
        {
            "facility": "Troll",
            "title": "Completed: Troll A platform inspection",
            "summary": "Inspection completed at Troll A platform. No capacity impact. "
                       f"Completed {(now - timedelta(days=8)).strftime('%Y-%m-%d')}.",
            "capacity_reduction_pct": None,
            "days_from_now_start": -15,
            "days_from_now_end": -8,
        },
    ]

    for group, evt_type in [
        (planned_events, "planned_maintenance"),
        (active_events, "capacity_reduction"),
        (recent_events, "restart"),
    ]:
        for evt in group:
            start_dt = now + timedelta(days=evt["days_from_now_start"])
            end_dt = now + timedelta(days=evt["days_from_now_end"])
            events.append(
                {
                    "title": evt["title"],
                    "summary": evt["summary"],
                    "event_type": evt_type if evt_type != "restart" or evt.get("capacity_reduction_pct") is None else "capacity_reduction",
                    "facility": evt["facility"],
                    "capacity_reduction_pct": evt["capacity_reduction_pct"],
                    "start_date": start_dt.strftime("%Y-%m-%d"),
                    "end_date": end_dt.strftime("%Y-%m-%d"),
                    "published": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "link": f"https://umm.gassco.no/event/{evt['facility'].lower().replace(' ', '-')}",
                }
            )

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

    match = re.search(r"(\d+(?:\.\d+)?)\s*%", summary)
    if match:
        return float(match.group(1))
    return None


def _extract_dates(summary: str, published: str) -> tuple[str | None, str | None]:
    """Try to extract start and end dates from UMM summary."""
    import re

    dates = re.findall(r"\d{4}-\d{2}-\d{2}", summary)
    start = dates[0] if len(dates) >= 1 else published[:10] if published else None
    end = dates[1] if len(dates) >= 2 else None
    return start, end
