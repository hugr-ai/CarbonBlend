"""Tests for CarbonBlend API endpoints."""

from __future__ import annotations

import pytest


# ---------------------------------------------------------------------------
# GET /api/fields
# ---------------------------------------------------------------------------

class TestFieldsEndpoints:
    """Tests for the fields API."""

    def test_list_fields(self, client):
        """GET /api/fields returns the seeded fields."""
        resp = client.get("/api/fields")
        assert resp.status_code == 200

        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 3  # TROLL, ORMEN LANGE, HALTENBANKEN EAST

    def test_list_fields_search_troll(self, client):
        """GET /api/fields?search=TROLL returns filtered results."""
        resp = client.get("/api/fields", params={"search": "TROLL"})
        assert resp.status_code == 200

        data = resp.json()
        assert len(data) >= 1
        assert any(f["name"] == "TROLL" for f in data)

    def test_list_fields_search_case_insensitive(self, client):
        """Search should be case-insensitive."""
        resp = client.get("/api/fields", params={"search": "troll"})
        assert resp.status_code == 200

        data = resp.json()
        assert len(data) >= 1
        assert any(f["name"] == "TROLL" for f in data)

    def test_list_fields_search_no_results(self, client):
        """Search for non-existent field returns empty list."""
        resp = client.get("/api/fields", params={"search": "NONEXISTENT"})
        assert resp.status_code == 200

        data = resp.json()
        assert data == []

    def test_list_fields_filter_by_area(self, client):
        """Filter by main_area."""
        resp = client.get("/api/fields", params={"area": "North Sea"})
        assert resp.status_code == 200

        data = resp.json()
        assert all("North Sea" in f["main_area"] for f in data)

    def test_get_field_by_npdid(self, client):
        """GET /api/fields/{npdid} returns a single field."""
        resp = client.get("/api/fields/100")
        assert resp.status_code == 200

        data = resp.json()
        assert data["npdid_field"] == 100
        assert data["name"] == "TROLL"
        assert data["main_area"] == "North Sea"

    def test_get_field_with_co2_spec(self, client):
        """Field with CO2 spec should include it in response."""
        resp = client.get("/api/fields/100")
        assert resp.status_code == 200

        data = resp.json()
        assert data["co2_spec"] is not None
        assert data["co2_spec"]["co2_mol_pct"] == 1.3

    def test_get_field_without_co2_spec(self, client):
        """Field without CO2 spec should have null co2_spec."""
        resp = client.get("/api/fields/200")
        assert resp.status_code == 200

        data = resp.json()
        assert data["name"] == "ORMEN LANGE"
        assert data["co2_spec"] is None

    def test_get_field_not_found(self, client):
        """GET /api/fields/{npdid} with bad ID returns 404."""
        resp = client.get("/api/fields/999999")
        assert resp.status_code == 404

    def test_list_fields_has_co2_data_true(self, client):
        """Filter to only fields with CO2 data."""
        resp = client.get("/api/fields", params={"has_co2_data": "true"})
        assert resp.status_code == 200

        data = resp.json()
        # TROLL and HALTENBANKEN EAST have CO2 data
        assert len(data) == 2
        names = {f["name"] for f in data}
        assert "TROLL" in names
        assert "HALTENBANKEN EAST" in names

    def test_list_fields_has_co2_data_false(self, client):
        """Filter to only fields without CO2 data."""
        resp = client.get("/api/fields", params={"has_co2_data": "false"})
        assert resp.status_code == 200

        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "ORMEN LANGE"


# ---------------------------------------------------------------------------
# GET /api/pipelines
# ---------------------------------------------------------------------------

class TestPipelinesEndpoints:
    """Tests for the pipelines API."""

    def test_list_pipelines(self, client):
        """GET /api/pipelines returns the seeded pipelines."""
        resp = client.get("/api/pipelines")
        assert resp.status_code == 200

        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2

    def test_pipeline_has_expected_fields(self, client):
        """Pipeline objects should contain key fields."""
        resp = client.get("/api/pipelines")
        data = resp.json()

        pipe = data[0]
        assert "npdid_pipeline" in pipe
        assert "name" in pipe
        assert "diameter_inches" in pipe
        assert "medium" in pipe


# ---------------------------------------------------------------------------
# GET /api/processing-plants
# ---------------------------------------------------------------------------

class TestProcessingPlantsEndpoints:
    """Tests for the processing plants API."""

    def test_list_processing_plants(self, client):
        """GET /api/processing-plants returns 3 plants."""
        resp = client.get("/api/processing-plants")
        assert resp.status_code == 200

        data = resp.json()
        assert len(data) == 3

    def test_processing_plant_fields(self, client):
        """Plant objects should have name and capacity."""
        resp = client.get("/api/processing-plants")
        data = resp.json()

        names = {p["name"] for p in data}
        assert "Kollsnes" in names
        assert "Karsto" in names
        assert "Nyhamna" in names


# ---------------------------------------------------------------------------
# GET /api/export-terminals
# ---------------------------------------------------------------------------

class TestExportTerminalsEndpoints:
    """Tests for the export terminals API."""

    def test_list_export_terminals(self, client):
        """GET /api/export-terminals returns 6 terminals."""
        resp = client.get("/api/export-terminals")
        assert resp.status_code == 200

        data = resp.json()
        assert len(data) == 6

    def test_terminal_contains_pricing(self, client):
        """Terminal objects should contain pricing info."""
        resp = client.get("/api/export-terminals")
        data = resp.json()

        for term in data:
            assert "name" in term
            assert "country" in term
            assert "default_price" in term
            assert "currency" in term
            assert "co2_entry_spec_mol_pct" in term


# ---------------------------------------------------------------------------
# POST /api/co2/blend
# ---------------------------------------------------------------------------

class TestCO2BlendEndpoint:
    """Tests for the CO2 blending API endpoint."""

    def test_blend_two_streams(self, client):
        """POST /api/co2/blend returns correct blended CO2."""
        payload = {
            "streams": [
                {"name": "Haltenbanken East", "flow_rate": 15.0, "co2_mol_pct": 9.0},
                {"name": "Troll", "flow_rate": 50.0, "co2_mol_pct": 1.3},
            ]
        }
        resp = client.post("/api/co2/blend", json=payload)
        assert resp.status_code == 200

        data = resp.json()
        assert abs(data["blended_co2_mol_pct"] - 3.0769) < 0.001
        assert data["total_flow"] == 65.0
        assert data["meets_target"] is False
        assert data["target_co2_mol_pct"] == 2.5
        assert len(data["contributions"]) == 2

    def test_blend_single_stream(self, client):
        """Blending a single low-CO2 stream should meet target."""
        payload = {
            "streams": [
                {"name": "Troll", "flow_rate": 50.0, "co2_mol_pct": 1.3},
            ]
        }
        resp = client.post("/api/co2/blend", json=payload)
        assert resp.status_code == 200

        data = resp.json()
        assert data["blended_co2_mol_pct"] == 1.3
        assert data["meets_target"] is True

    def test_blend_empty_streams(self, client):
        """Empty streams list should return zero."""
        payload = {"streams": []}
        resp = client.post("/api/co2/blend", json=payload)
        assert resp.status_code == 200

        data = resp.json()
        assert data["blended_co2_mol_pct"] == 0.0
        assert data["total_flow"] == 0.0


# ---------------------------------------------------------------------------
# GET /api/tariffs
# ---------------------------------------------------------------------------

class TestTariffsEndpoints:
    """Tests for the tariffs API."""

    def test_list_tariffs(self, client):
        """GET /api/tariffs returns tariff data."""
        resp = client.get("/api/tariffs")
        assert resp.status_code == 200

        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 3  # Gassled, Langeled, Europipe II

    def test_tariff_has_elements(self, client):
        """Tariff objects should contain K, U, I, O elements."""
        resp = client.get("/api/tariffs")
        data = resp.json()

        for tariff in data:
            assert "pipeline_segment" in tariff
            assert "k_element" in tariff
            assert "u_element" in tariff
            assert "i_element" in tariff
            assert "o_element" in tariff
            assert "unit_tariff_nok_sm3" in tariff


# ---------------------------------------------------------------------------
# GET /api/markets
# ---------------------------------------------------------------------------

class TestMarketsEndpoints:
    """Tests for the markets API."""

    def test_list_markets(self, client):
        """GET /api/markets returns market data for all terminals."""
        resp = client.get("/api/markets")
        assert resp.status_code == 200

        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 6

    def test_market_has_pricing(self, client):
        """Market objects should contain terminal, price, and hub info."""
        resp = client.get("/api/markets")
        data = resp.json()

        for market in data:
            assert "terminal" in market
            assert "country" in market
            assert "default_price" in market
            assert "hub_name" in market


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthCheck:
    """Tests for the health check endpoint."""

    def test_health_check(self, client):
        """GET /api/health returns ok."""
        resp = client.get("/api/health")
        assert resp.status_code == 200

        data = resp.json()
        assert data["status"] == "ok"
        assert data["app"] == "CarbonBlend"
