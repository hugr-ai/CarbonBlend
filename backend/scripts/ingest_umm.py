"""Fetch UMM (Urgent Market Messages) from Gassco Atom feed and store in DB.

Run with: python -m backend.scripts.ingest_umm
Or: cd backend && python -m scripts.ingest_umm
"""

from __future__ import annotations

import hashlib
import logging
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.services.umm_client import fetch_umm_feed

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main():
    """Fetch UMM feed and log results.

    Note: UMM events are fetched live and not persisted to DB in the current
    implementation. This script demonstrates the fetch and parse flow.
    For production, you would store events in a dedicated UMM table.
    """
    logger.info("=== CarbonBlend UMM Feed Ingestion ===")

    events = fetch_umm_feed()

    if not events:
        logger.info("No UMM events returned from feed.")
        return

    logger.info("Fetched %d UMM events:", len(events))
    for i, event in enumerate(events, 1):
        logger.info(
            "  [%d] %s | Type: %s | Facility: %s | Reduction: %s%%",
            i,
            event.get("title", "N/A")[:80],
            event.get("event_type", "unknown"),
            event.get("facility", "N/A"),
            event.get("capacity_reduction_pct", "N/A"),
        )

    # Summary
    by_type: dict[str, int] = {}
    for event in events:
        t = event.get("event_type", "unknown")
        by_type[t] = by_type.get(t, 0) + 1

    logger.info("Event type breakdown:")
    for t, count in sorted(by_type.items()):
        logger.info("  %s: %d", t, count)

    logger.info("=== UMM Ingestion Complete ===")


if __name__ == "__main__":
    main()
