"""Ingest NPD data: fetch CSVs, parse, upsert into SQLite, load seed data.

Run with: python -m backend.scripts.ingest_npd
(from the project root, one level above backend/)

Or: cd backend && python -m scripts.ingest_npd
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

# Ensure backend package is importable
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models.field import Field
from app.models.discovery import Discovery
from app.models.facility import Facility
from app.models.pipeline import Pipeline
from app.models.co2_spec import CO2Spec
from app.models.processing_plant import ProcessingPlant
from app.models.export_terminal import ExportTerminal
from app.models.storage_site import StorageSite
from app.models.processing_option import ProcessingOption
from app.models.tariff import Tariff
from app.services.npd_client import (
    fetch_fields_csv,
    fetch_facilities_csv,
    fetch_pipelines_csv,
    fetch_discoveries_csv,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def _safe_int(val) -> int | None:
    if isinstance(val, pd.Series):
        val = val.iloc[0]
    try:
        if pd.isna(val):
            return None
        return int(val)
    except (ValueError, TypeError):
        return None


def _safe_float(val) -> float | None:
    if isinstance(val, pd.Series):
        val = val.iloc[0]
    try:
        if pd.isna(val):
            return None
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_str(val) -> str | None:
    # Handle Series (from duplicate columns) by taking first value
    if isinstance(val, pd.Series):
        val = val.iloc[0]
    try:
        if pd.isna(val):
            return None
    except (ValueError, TypeError):
        pass
    return str(val).strip() if val is not None else None


# ---------------------------------------------------------------------------
# Ingest functions
# ---------------------------------------------------------------------------

def ingest_fields(db: Session) -> int:
    """Fetch and ingest field data from NPD."""
    logger.info("Fetching fields CSV from NPD...")
    try:
        df = fetch_fields_csv()
    except Exception as exc:
        logger.error("Failed to fetch fields: %s", exc)
        return 0

    count = 0
    for _, row in df.iterrows():
        npdid = _safe_int(row.get("fldNpdidField"))
        if npdid is None:
            continue

        existing = db.query(Field).filter(Field.npdid_field == npdid).first()
        if existing:
            existing.name = _safe_str(row.get("fldName")) or existing.name
            existing.main_area = _safe_str(row.get("fldMainArea"))
            existing.status = _safe_str(row.get("fldCurrentActivitySatus"))
            existing.hc_type = _safe_str(row.get("fldHcType"))
            existing.operator = _safe_str(row.get("cmpLongName"))
            existing.discovery_year = _safe_int(row.get("fldDiscoveryYear"))
            existing.lat = _safe_float(row.get("fldNsDecDeg"))
            existing.lon = _safe_float(row.get("fldEwDesDeg"))
        else:
            db.add(
                Field(
                    npdid_field=npdid,
                    name=_safe_str(row.get("fldName")) or "Unknown",
                    main_area=_safe_str(row.get("fldMainArea")),
                    status=_safe_str(row.get("fldCurrentActivitySatus")),
                    hc_type=_safe_str(row.get("fldHcType")),
                    operator=_safe_str(row.get("cmpLongName")),
                    discovery_year=_safe_int(row.get("fldDiscoveryYear")),
                    lat=_safe_float(row.get("fldNsDecDeg")),
                    lon=_safe_float(row.get("fldEwDesDeg")),
                )
            )
        count += 1

    db.commit()
    logger.info("Ingested %d fields", count)
    return count


def ingest_facilities(db: Session) -> int:
    """Fetch and ingest facility data from NPD."""
    logger.info("Fetching facilities CSV from NPD...")
    try:
        df = fetch_facilities_csv()
    except Exception as exc:
        logger.error("Failed to fetch facilities: %s", exc)
        return 0

    count = 0
    for _, row in df.iterrows():
        npdid = _safe_int(row.get("fclNpdidFacility"))
        if npdid is None:
            continue

        existing = db.query(Facility).filter(Facility.npdid_facility == npdid).first()
        if existing:
            existing.name = _safe_str(row.get("fclName")) or existing.name
            existing.kind = _safe_str(row.get("fclKind"))
            existing.phase = _safe_str(row.get("fclPhase"))
            existing.functions = _safe_str(row.get("fclFunctions"))
            existing.belongs_to_name = _safe_str(row.get("fclBelongsToName"))
            existing.operator = _safe_str(row.get("cmpLongName"))
            existing.water_depth = _safe_float(row.get("fclWaterDepth"))
            existing.startup_date = _safe_str(row.get("fclStartupDate"))
            existing.lat = _safe_float(row.get("fclNsDecDeg"))
            existing.lon = _safe_float(row.get("fclEwDesDeg"))
        else:
            db.add(
                Facility(
                    npdid_facility=npdid,
                    name=_safe_str(row.get("fclName")) or "Unknown",
                    kind=_safe_str(row.get("fclKind")),
                    phase=_safe_str(row.get("fclPhase")),
                    functions=_safe_str(row.get("fclFunctions")),
                    belongs_to_name=_safe_str(row.get("fclBelongsToName")),
                    operator=_safe_str(row.get("cmpLongName")),
                    water_depth=_safe_float(row.get("fclWaterDepth")),
                    startup_date=_safe_str(row.get("fclStartupDate")),
                    lat=_safe_float(row.get("fclNsDecDeg")),
                    lon=_safe_float(row.get("fclEwDesDeg")),
                )
            )
        count += 1

    db.commit()
    logger.info("Ingested %d facilities", count)
    return count


def ingest_pipelines(db: Session) -> int:
    """Fetch and ingest pipeline data from NPD."""
    logger.info("Fetching pipelines CSV from NPD...")
    try:
        df = fetch_pipelines_csv()
    except Exception as exc:
        logger.error("Failed to fetch pipelines: %s", exc)
        return 0

    count = 0
    for _, row in df.iterrows():
        npdid = _safe_int(row.get("pipNpdidPipe"))
        if npdid is None:
            continue

        existing = db.query(Pipeline).filter(Pipeline.npdid_pipeline == npdid).first()
        if existing:
            existing.name = _safe_str(row.get("pipName")) or existing.name
            existing.belongs_to = _safe_str(row.get("pipBelongsTo"))
            existing.operator = _safe_str(row.get("cmpLongName"))
            existing.phase = _safe_str(row.get("pipCurrentPhase"))
            existing.from_facility = _safe_str(row.get("pipFromFacility"))
            existing.to_facility = _safe_str(row.get("pipToFacility"))
            existing.from_facility_id = _safe_int(row.get("pipFromFacilityId"))
            existing.to_facility_id = _safe_int(row.get("pipToFacilityId"))
            existing.diameter_inches = _safe_float(row.get("pipDiameter"))
            existing.medium = _safe_str(row.get("pipMedium"))
            existing.main_grouping = _safe_str(row.get("pipMainGrouping"))
            existing.water_depth = _safe_float(row.get("pipWaterDepth"))
        else:
            db.add(
                Pipeline(
                    npdid_pipeline=npdid,
                    name=_safe_str(row.get("pipName")) or "Unknown",
                    belongs_to=_safe_str(row.get("pipBelongsTo")),
                    operator=_safe_str(row.get("cmpLongName")),
                    phase=_safe_str(row.get("pipCurrentPhase")),
                    from_facility=_safe_str(row.get("pipFromFacility")),
                    to_facility=_safe_str(row.get("pipToFacility")),
                    from_facility_id=_safe_int(row.get("pipFromFacilityId")),
                    to_facility_id=_safe_int(row.get("pipToFacilityId")),
                    diameter_inches=_safe_float(row.get("pipDiameter")),
                    medium=_safe_str(row.get("pipMedium")),
                    main_grouping=_safe_str(row.get("pipMainGrouping")),
                    water_depth=_safe_float(row.get("pipWaterDepth")),
                )
            )
        count += 1

    db.commit()
    logger.info("Ingested %d pipelines", count)
    return count


def ingest_discoveries(db: Session) -> int:
    """Fetch and ingest discovery data from NPD."""
    logger.info("Fetching discoveries CSV from NPD...")
    try:
        df = fetch_discoveries_csv()
    except Exception as exc:
        logger.error("Failed to fetch discoveries: %s", exc)
        return 0

    count = 0
    for _, row in df.iterrows():
        npdid = _safe_int(row.get("dscNpdidDiscovery"))
        if npdid is None:
            continue

        existing = db.query(Discovery).filter(Discovery.npdid_discovery == npdid).first()
        if existing:
            existing.name = _safe_str(row.get("dscName")) or existing.name
            existing.main_area = _safe_str(row.get("dscMainArea"))
            existing.status = _safe_str(row.get("dscCurrentActivityStatus"))
            existing.hc_type = _safe_str(row.get("dscHcType"))
            existing.operator = _safe_str(row.get("cmpLongName"))
            existing.discovery_year = _safe_int(row.get("dscDiscoveryYear"))
            existing.discovery_well = _safe_str(row.get("dscWlbName"))
            existing.lat = _safe_float(row.get("dscNsDecDeg"))
            existing.lon = _safe_float(row.get("dscEwDesDeg"))
        else:
            db.add(
                Discovery(
                    npdid_discovery=npdid,
                    name=_safe_str(row.get("dscName")) or "Unknown",
                    main_area=_safe_str(row.get("dscMainArea")),
                    status=_safe_str(row.get("dscCurrentActivityStatus")),
                    hc_type=_safe_str(row.get("dscHcType")),
                    operator=_safe_str(row.get("cmpLongName")),
                    discovery_year=_safe_int(row.get("dscDiscoveryYear")),
                    discovery_well=_safe_str(row.get("dscWlbName")),
                    lat=_safe_float(row.get("dscNsDecDeg")),
                    lon=_safe_float(row.get("dscEwDesDeg")),
                )
            )
        count += 1

    db.commit()
    logger.info("Ingested %d discoveries", count)
    return count


# ---------------------------------------------------------------------------
# Seed data loaders
# ---------------------------------------------------------------------------

def seed_co2_reference(db: Session) -> int:
    """Load CO2 reference data from seed JSON."""
    seed_path = settings.seed_dir / "co2_reference.json"
    logger.info("Loading CO2 reference from %s", seed_path)

    with open(seed_path) as f:
        data = json.load(f)

    count = 0
    for item in data:
        existing = (
            db.query(CO2Spec)
            .filter(
                CO2Spec.entity_type == item["entity_type"],
                CO2Spec.entity_name == item["entity_name"],
            )
            .first()
        )
        if existing:
            existing.co2_mol_pct = item["co2_mol_pct"]
            existing.co2_mol_pct_range_low = item.get("co2_mol_pct_range_low")
            existing.co2_mol_pct_range_high = item.get("co2_mol_pct_range_high")
            existing.source = item.get("source")
            existing.notes = item.get("notes")
        else:
            db.add(
                CO2Spec(
                    entity_type=item["entity_type"],
                    entity_name=item["entity_name"],
                    co2_mol_pct=item["co2_mol_pct"],
                    co2_mol_pct_range_low=item.get("co2_mol_pct_range_low"),
                    co2_mol_pct_range_high=item.get("co2_mol_pct_range_high"),
                    source=item.get("source"),
                    notes=item.get("notes"),
                )
            )
        count += 1

    db.commit()
    logger.info("Seeded %d CO2 specs", count)
    return count


def seed_tariffs(db: Session) -> int:
    """Load tariff reference data from seed JSON."""
    seed_path = settings.seed_dir / "tariff_reference.json"
    logger.info("Loading tariffs from %s", seed_path)

    with open(seed_path) as f:
        data = json.load(f)

    count = 0
    for item in data:
        k = item.get("k_element", 0)
        u = item.get("u_element", 0)
        i = item.get("i_element", 0)
        o = item.get("o_element", 0)
        unit_tariff = k + u + i + o

        existing = (
            db.query(Tariff)
            .filter(Tariff.pipeline_segment == item["pipeline_segment"])
            .first()
        )
        if existing:
            existing.baa = item.get("baa")
            existing.k_element = k
            existing.u_element = u
            existing.i_element = i
            existing.o_element = o
            existing.unit_tariff_nok_sm3 = unit_tariff
            existing.year = item.get("year")
        else:
            db.add(
                Tariff(
                    pipeline_segment=item["pipeline_segment"],
                    baa=item.get("baa"),
                    k_element=k,
                    u_element=u,
                    i_element=i,
                    o_element=o,
                    unit_tariff_nok_sm3=unit_tariff,
                    year=item.get("year"),
                )
            )
        count += 1

    db.commit()
    logger.info("Seeded %d tariffs", count)
    return count


def seed_markets(db: Session) -> int:
    """Load market / export terminal data from seed JSON."""
    seed_path = settings.seed_dir / "market_reference.json"
    logger.info("Loading markets from %s", seed_path)

    with open(seed_path) as f:
        data = json.load(f)

    count = 0
    for item in data:
        existing = (
            db.query(ExportTerminal)
            .filter(ExportTerminal.name == item["name"])
            .first()
        )
        if existing:
            existing.country = item.get("country")
            existing.pipeline_feed = item.get("pipeline_feed")
            existing.hub_name = item.get("hub_name")
            existing.default_price = item.get("default_price")
            existing.currency = item.get("currency")
            existing.co2_entry_spec_mol_pct = item.get("co2_entry_spec_mol_pct")
            existing.lat = item.get("lat")
            existing.lon = item.get("lon")
        else:
            db.add(
                ExportTerminal(
                    name=item["name"],
                    country=item.get("country"),
                    pipeline_feed=item.get("pipeline_feed"),
                    hub_name=item.get("hub_name"),
                    default_price=item.get("default_price"),
                    currency=item.get("currency"),
                    co2_entry_spec_mol_pct=item.get("co2_entry_spec_mol_pct"),
                    lat=item.get("lat"),
                    lon=item.get("lon"),
                )
            )
        count += 1

    db.commit()
    logger.info("Seeded %d export terminals", count)
    return count


def seed_costs(db: Session) -> int:
    """Load CO2 processing options and storage sites from seed JSON."""
    seed_path = settings.seed_dir / "cost_reference.json"
    logger.info("Loading cost reference from %s", seed_path)

    with open(seed_path) as f:
        data = json.load(f)

    count = 0

    # Processing options
    for item in data.get("processing_options", []):
        existing = (
            db.query(ProcessingOption)
            .filter(ProcessingOption.name == item["name"])
            .first()
        )
        if existing:
            existing.capex_per_mtpa = item.get("capex_per_mtpa")
            existing.opex_per_tonne = item.get("opex_per_tonne")
            existing.removal_efficiency = item.get("removal_efficiency")
            existing.energy_penalty_pct = item.get("energy_penalty_pct")
            existing.maturity = item.get("maturity")
        else:
            db.add(
                ProcessingOption(
                    name=item["name"],
                    capex_per_mtpa=item.get("capex_per_mtpa"),
                    opex_per_tonne=item.get("opex_per_tonne"),
                    removal_efficiency=item.get("removal_efficiency"),
                    energy_penalty_pct=item.get("energy_penalty_pct"),
                    maturity=item.get("maturity"),
                )
            )
        count += 1

    # Storage sites
    for item in data.get("storage_sites", []):
        existing = (
            db.query(StorageSite)
            .filter(StorageSite.name == item["name"])
            .first()
        )
        if existing:
            existing.type = item.get("type")
            existing.capacity_mt = item.get("capacity_mt")
            existing.injection_rate_mtpa = item.get("injection_rate_mtpa")
            existing.status = item.get("status")
            existing.lat = item.get("lat")
            existing.lon = item.get("lon")
        else:
            db.add(
                StorageSite(
                    name=item["name"],
                    type=item.get("type"),
                    capacity_mt=item.get("capacity_mt"),
                    injection_rate_mtpa=item.get("injection_rate_mtpa"),
                    status=item.get("status"),
                    lat=item.get("lat"),
                    lon=item.get("lon"),
                )
            )
        count += 1

    db.commit()
    logger.info("Seeded %d processing options and storage sites", count)
    return count


def seed_processing_plants(db: Session) -> int:
    """Seed onshore processing plants (Kollsnes, Kårstø, Nyhamna)."""
    plants = [
        {
            "name": "Kollsnes",
            "capacity_mscm_d": 143.0,
            "ngl_capacity_mt_yr": None,
            "has_co2_removal": False,
            "source_fields": json.dumps(["TROLL", "KVITEBJØRN", "VISUND", "FRAM"]),
            "export_pipelines": json.dumps(["Zeepipe", "Europipe I", "Europipe II"]),
            "lat": 60.57,
            "lon": 4.83,
        },
        {
            "name": "Kårstø",
            "capacity_mscm_d": 88.0,
            "ngl_capacity_mt_yr": 5.5,
            "has_co2_removal": False,
            "source_fields": json.dumps(
                ["ÅSGARD", "KRISTIN", "SLEIPNER", "GUDRUN", "KVITEBJØRN"]
            ),
            "export_pipelines": json.dumps(["Europipe II", "Statpipe", "Langeled"]),
            "lat": 59.28,
            "lon": 5.53,
        },
        {
            "name": "Nyhamna",
            "capacity_mscm_d": 84.0,
            "ngl_capacity_mt_yr": None,
            "has_co2_removal": False,
            "source_fields": json.dumps(["ORMEN LANGE", "AASTA HANSTEEN"]),
            "export_pipelines": json.dumps(["Langeled"]),
            "lat": 62.84,
            "lon": 6.72,
        },
    ]

    count = 0
    for p in plants:
        existing = (
            db.query(ProcessingPlant)
            .filter(ProcessingPlant.name == p["name"])
            .first()
        )
        if existing:
            for k, v in p.items():
                setattr(existing, k, v)
        else:
            db.add(ProcessingPlant(**p))
        count += 1

    db.commit()
    logger.info("Seeded %d processing plants", count)
    return count


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    """Run full ingestion pipeline."""
    logger.info("=== CarbonBlend NPD Data Ingestion ===")

    # Ensure data directory exists
    settings.data_dir.mkdir(parents=True, exist_ok=True)

    # Create tables
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Fetch and ingest NPD data
        logger.info("--- Phase 1: NPD CSV Ingestion ---")
        ingest_fields(db)
        ingest_facilities(db)
        ingest_pipelines(db)
        ingest_discoveries(db)

        # Load seed/reference data
        logger.info("--- Phase 2: Seed Data ---")
        seed_co2_reference(db)
        seed_tariffs(db)
        seed_markets(db)
        seed_costs(db)
        seed_processing_plants(db)

        logger.info("=== Ingestion Complete ===")

    finally:
        db.close()


if __name__ == "__main__":
    main()
