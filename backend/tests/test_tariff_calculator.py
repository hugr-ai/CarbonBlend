"""Tests for tariff calculation service (app.services.tariff_calculator)."""

from __future__ import annotations

import pytest

from app.services.tariff_calculator import get_tariff_for_segment, calculate_route_tariff


# ---------------------------------------------------------------------------
# get_tariff_for_segment
# ---------------------------------------------------------------------------

class TestGetTariffForSegment:
    """Tests for single-segment tariff lookups."""

    def test_known_segment(self, seeded_db):
        """Lookup a tariff for an existing segment."""
        result = get_tariff_for_segment("Gassled", seeded_db)

        assert result is not None
        assert result["pipeline_segment"] == "Gassled"
        assert result["k_element"] == 0.01
        assert result["u_element"] == 0.002
        assert result["i_element"] == 0.001
        assert result["o_element"] == 0.005

        # Total should be K + U + I + O
        expected_total = 0.01 + 0.002 + 0.001 + 0.005
        assert abs(result["unit_tariff_nok_sm3"] - expected_total) < 1e-6

    def test_langeled_segment(self, seeded_db):
        """Lookup Langeled tariff."""
        result = get_tariff_for_segment("Langeled", seeded_db)

        assert result is not None
        assert result["pipeline_segment"] == "Langeled"
        assert result["year"] == 2024

    def test_case_insensitive_lookup(self, seeded_db):
        """Segment name lookup is case-insensitive (uses ilike)."""
        result = get_tariff_for_segment("langeled", seeded_db)
        assert result is not None
        assert result["pipeline_segment"] == "Langeled"

    def test_partial_match(self, seeded_db):
        """Partial name match should find the segment."""
        result = get_tariff_for_segment("Europipe", seeded_db)
        assert result is not None
        assert "Europipe" in result["pipeline_segment"]

    def test_unknown_segment_returns_none(self, seeded_db):
        """Unknown segment returns None."""
        result = get_tariff_for_segment("NonExistentPipeline", seeded_db)
        assert result is None


# ---------------------------------------------------------------------------
# calculate_route_tariff
# ---------------------------------------------------------------------------

class TestCalculateRouteTariff:
    """Tests for multi-segment route tariff calculation."""

    def test_single_segment_route(self, seeded_db):
        """Route with one segment."""
        result = calculate_route_tariff(["Gassled"], seeded_db)

        assert result["num_segments"] == 1
        assert len(result["missing_segments"]) == 0
        assert result["total_tariff_nok_sm3"] > 0
        assert abs(result["total_k_element"] - 0.01) < 1e-6

    def test_multi_segment_route(self, seeded_db):
        """Route with two segments: Gassled + Langeled."""
        result = calculate_route_tariff(["Gassled", "Langeled"], seeded_db)

        assert result["num_segments"] == 2
        assert len(result["missing_segments"]) == 0

        # Totals should be sum of both segments
        expected_k = 0.01 + 0.015
        expected_u = 0.002 + 0.003
        expected_i = 0.001 + 0.002
        expected_o = 0.005 + 0.004
        expected_total = expected_k + expected_u + expected_i + expected_o

        assert abs(result["total_k_element"] - expected_k) < 1e-6
        assert abs(result["total_u_element"] - expected_u) < 1e-6
        assert abs(result["total_i_element"] - expected_i) < 1e-6
        assert abs(result["total_o_element"] - expected_o) < 1e-6
        assert abs(result["total_tariff_nok_sm3"] - expected_total) < 1e-6

    def test_route_with_unknown_segment(self, seeded_db):
        """Route with one known and one unknown segment."""
        result = calculate_route_tariff(["Gassled", "FakePipe"], seeded_db)

        assert result["num_segments"] == 1
        assert "FakePipe" in result["missing_segments"]

        # Total should only include Gassled
        expected_total = 0.01 + 0.002 + 0.001 + 0.005
        assert abs(result["total_tariff_nok_sm3"] - expected_total) < 1e-6

    def test_all_unknown_segments(self, seeded_db):
        """Route where no segments are found."""
        result = calculate_route_tariff(["Unknown1", "Unknown2"], seeded_db)

        assert result["num_segments"] == 0
        assert len(result["missing_segments"]) == 2
        assert result["total_tariff_nok_sm3"] == 0.0

    def test_empty_route(self, seeded_db):
        """Empty route returns zero tariff."""
        result = calculate_route_tariff([], seeded_db)

        assert result["num_segments"] == 0
        assert result["total_tariff_nok_sm3"] == 0.0

    def test_three_segment_route(self, seeded_db):
        """Route with all three test segments."""
        result = calculate_route_tariff(
            ["Gassled", "Langeled", "Europipe II"], seeded_db
        )

        assert result["num_segments"] == 3
        assert len(result["missing_segments"]) == 0

        # Total K: 0.01 + 0.015 + 0.012
        expected_k = 0.01 + 0.015 + 0.012
        assert abs(result["total_k_element"] - expected_k) < 1e-6
