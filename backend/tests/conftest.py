"""Shared pytest fixtures for CarbonBlend backend tests."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure the backend package is importable when running from the backend dir
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base, get_db
from app.models.field import Field
from app.models.facility import Facility
from app.models.pipeline import Pipeline
from app.models.tariff import Tariff
from app.models.co2_spec import CO2Spec
from app.models.processing_plant import ProcessingPlant
from app.models.export_terminal import ExportTerminal
from app.models.processing_option import ProcessingOption
from app.models.storage_site import StorageSite

# ---------------------------------------------------------------------------
# Database fixtures
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite://"  # in-memory


@pytest.fixture(scope="session")
def engine():
    """Create a shared in-memory SQLite engine for the test session."""
    eng = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db_session(engine):
    """Yield a transactional database session that rolls back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# Seed data fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def seeded_db(db_session):
    """Populate the test database with representative seed data.

    Creates fields, facilities, pipelines, tariffs, CO2 specs,
    processing plants, export terminals, and processing options.
    """
    # -- Fields --
    fields = [
        Field(
            npdid_field=100,
            name="TROLL",
            main_area="North Sea",
            status="Producing",
            hc_type="GAS",
            operator="Equinor",
            discovery_year=1979,
            lat=60.64,
            lon=3.72,
        ),
        Field(
            npdid_field=200,
            name="ORMEN LANGE",
            main_area="Norwegian Sea",
            status="Producing",
            hc_type="GAS",
            operator="Shell",
            discovery_year=1997,
            lat=63.00,
            lon=5.00,
        ),
        Field(
            npdid_field=300,
            name="HALTENBANKEN EAST",
            main_area="Norwegian Sea",
            status="PDO Approved",
            hc_type="GAS",
            operator="Equinor",
            discovery_year=2010,
            lat=64.50,
            lon=7.50,
        ),
    ]
    db_session.add_all(fields)

    # -- Facilities --
    facilities = [
        Facility(
            npdid_facility=1001,
            name="TROLL A",
            kind="PLATFORM",
            phase="In service",
            functions="Production, Processing",
            belongs_to_name="TROLL",
            operator="Equinor",
            water_depth=303.0,
            lat=60.64,
            lon=3.72,
        ),
        Facility(
            npdid_facility=1002,
            name="KOLLSNES",
            kind="ONSHORE",
            phase="In service",
            functions="Processing",
            belongs_to_name=None,
            operator="Gassco",
            water_depth=None,
            lat=60.56,
            lon=4.84,
        ),
        Facility(
            npdid_facility=1003,
            name="NYHAMNA",
            kind="ONSHORE",
            phase="In service",
            functions="Processing",
            belongs_to_name=None,
            operator="Shell",
            water_depth=None,
            lat=62.83,
            lon=6.78,
        ),
    ]
    db_session.add_all(facilities)

    # -- Pipelines --
    pipelines = [
        Pipeline(
            npdid_pipeline=5001,
            name="Troll Gas Pipeline I",
            belongs_to="Troll",
            operator="Equinor",
            phase="In service",
            from_facility="TROLL A",
            to_facility="KOLLSNES",
            from_facility_id=1001,
            to_facility_id=1002,
            diameter_inches=36.0,
            medium="Rich Gas",
            main_grouping="Gassled",
        ),
        Pipeline(
            npdid_pipeline=5002,
            name="Langeled South",
            belongs_to="Langeled",
            operator="Gassco",
            phase="In service",
            from_facility="KOLLSNES",
            to_facility="NYHAMNA",
            from_facility_id=1002,
            to_facility_id=1003,
            diameter_inches=42.0,
            medium="Dry Gas",
            main_grouping="Langeled",
        ),
    ]
    db_session.add_all(pipelines)

    # -- Tariffs --
    tariffs = [
        Tariff(
            id=1,
            pipeline_segment="Gassled",
            baa="BAA-1",
            k_element=0.01,
            u_element=0.002,
            i_element=0.001,
            o_element=0.005,
            unit_tariff_nok_sm3=0.018,
            year=2024,
        ),
        Tariff(
            id=2,
            pipeline_segment="Langeled",
            baa="BAA-2",
            k_element=0.015,
            u_element=0.003,
            i_element=0.002,
            o_element=0.004,
            unit_tariff_nok_sm3=0.024,
            year=2024,
        ),
        Tariff(
            id=3,
            pipeline_segment="Europipe II",
            baa="BAA-3",
            k_element=0.012,
            u_element=0.0025,
            i_element=0.0015,
            o_element=0.006,
            unit_tariff_nok_sm3=0.022,
            year=2024,
        ),
    ]
    db_session.add_all(tariffs)

    # -- CO2 Specs --
    co2_specs = [
        CO2Spec(
            id=1,
            entity_type="field",
            entity_name="TROLL",
            entity_npdid=100,
            co2_mol_pct=1.3,
            co2_mol_pct_range_low=1.0,
            co2_mol_pct_range_high=1.6,
            source="NPD",
            notes="Low CO2",
        ),
        CO2Spec(
            id=2,
            entity_type="field",
            entity_name="HALTENBANKEN EAST",
            entity_npdid=300,
            co2_mol_pct=9.0,
            co2_mol_pct_range_low=8.0,
            co2_mol_pct_range_high=10.0,
            source="Operator estimate",
            notes="High CO2 field",
        ),
    ]
    db_session.add_all(co2_specs)

    # -- Processing plants --
    plants = [
        ProcessingPlant(
            id=1,
            name="Kollsnes",
            capacity_mscm_d=143.0,
            ngl_capacity_mt_yr=None,
            has_co2_removal=0,
            source_fields=json.dumps(["TROLL", "KVITEBJORN"]),
            export_pipelines=json.dumps(["Zeepipe IIA"]),
            lat=60.56,
            lon=4.84,
        ),
        ProcessingPlant(
            id=2,
            name="Karsto",
            capacity_mscm_d=88.0,
            ngl_capacity_mt_yr=5.0,
            has_co2_removal=1,
            source_fields=json.dumps(["ASGARD", "MIKKEL"]),
            export_pipelines=json.dumps(["Europipe II"]),
            lat=59.28,
            lon=5.52,
        ),
        ProcessingPlant(
            id=3,
            name="Nyhamna",
            capacity_mscm_d=84.0,
            ngl_capacity_mt_yr=None,
            has_co2_removal=0,
            source_fields=json.dumps(["ORMEN LANGE"]),
            export_pipelines=json.dumps(["Langeled"]),
            lat=62.83,
            lon=6.78,
        ),
    ]
    db_session.add_all(plants)

    # -- Export terminals --
    terminals = [
        ExportTerminal(
            id=1,
            name="St Fergus",
            country="UK",
            pipeline_feed="FLAGS",
            capacity_bcm_yr=30.0,
            co2_entry_spec_mol_pct=2.5,
            hub_name="NBP",
            default_price=28.0,
            currency="GBP/therm",
            lat=57.58,
            lon=-1.83,
        ),
        ExportTerminal(
            id=2,
            name="Easington",
            country="UK",
            pipeline_feed="Langeled",
            capacity_bcm_yr=26.0,
            co2_entry_spec_mol_pct=2.5,
            hub_name="NBP",
            default_price=28.0,
            currency="GBP/therm",
            lat=53.65,
            lon=0.12,
        ),
        ExportTerminal(
            id=3,
            name="Emden (EPT)",
            country="Germany",
            pipeline_feed="Europipe",
            capacity_bcm_yr=18.0,
            co2_entry_spec_mol_pct=2.5,
            hub_name="THE",
            default_price=30.0,
            currency="EUR/MWh",
            lat=53.37,
            lon=7.21,
        ),
        ExportTerminal(
            id=4,
            name="Dornum",
            country="Germany",
            pipeline_feed="Norpipe",
            capacity_bcm_yr=20.0,
            co2_entry_spec_mol_pct=2.5,
            hub_name="THE",
            default_price=30.0,
            currency="EUR/MWh",
            lat=53.64,
            lon=7.28,
        ),
        ExportTerminal(
            id=5,
            name="Dunkerque",
            country="France",
            pipeline_feed="Franpipe",
            capacity_bcm_yr=15.0,
            co2_entry_spec_mol_pct=2.5,
            hub_name="PEG",
            default_price=29.0,
            currency="EUR/MWh",
            lat=51.03,
            lon=2.37,
        ),
        ExportTerminal(
            id=6,
            name="Zeebrugge",
            country="Belgium",
            pipeline_feed="Zeepipe",
            capacity_bcm_yr=10.0,
            co2_entry_spec_mol_pct=2.5,
            hub_name="ZTP",
            default_price=29.5,
            currency="EUR/MWh",
            lat=51.33,
            lon=3.20,
        ),
    ]
    db_session.add_all(terminals)

    # -- Processing options --
    processing_options = [
        ProcessingOption(
            id=1,
            name="Amine Scrubbing (MEA)",
            capex_per_mtpa=150.0,
            opex_per_tonne=45.0,
            removal_efficiency=0.95,
            energy_penalty_pct=25.0,
            maturity="TRL 9 - Commercial",
        ),
        ProcessingOption(
            id=2,
            name="Membrane Separation",
            capex_per_mtpa=100.0,
            opex_per_tonne=30.0,
            removal_efficiency=0.85,
            energy_penalty_pct=10.0,
            maturity="TRL 7 - Demonstration",
        ),
    ]
    db_session.add_all(processing_options)

    db_session.commit()
    return db_session


# ---------------------------------------------------------------------------
# FastAPI TestClient fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def client(seeded_db):
    """Provide a FastAPI TestClient with the test database injected."""
    from fastapi.testclient import TestClient
    from app.main import app

    def _override_get_db():
        yield seeded_db

    app.dependency_overrides[get_db] = _override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
