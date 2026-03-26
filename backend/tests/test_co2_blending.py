"""Tests for CO2 blending calculations (app.services.co2_blending)."""

from __future__ import annotations

import pytest

from app.services.co2_blending import (
    calculate_blend,
    required_removal,
    blending_ratio_for_target,
)


# ---------------------------------------------------------------------------
# calculate_blend
# ---------------------------------------------------------------------------

class TestCalculateBlend:
    """Tests for the calculate_blend function."""

    def test_empty_streams(self):
        """Empty input returns zero totals and meets target."""
        result = calculate_blend([])
        assert result["blended_co2_mol_pct"] == 0.0
        assert result["total_flow"] == 0.0
        assert result["meets_target"] is True
        assert result["contributions"] == []

    def test_single_stream(self):
        """A single stream returns that stream's CO2 concentration."""
        streams = [{"name": "A", "flow_rate": 10.0, "co2_mol_pct": 3.5}]
        result = calculate_blend(streams)

        assert result["blended_co2_mol_pct"] == 3.5
        assert result["total_flow"] == 10.0
        assert result["meets_target"] is False  # 3.5 > 2.5
        assert len(result["contributions"]) == 1
        assert result["contributions"][0]["flow_fraction"] == 1.0

    def test_single_stream_below_target(self):
        """A single stream below the 2.5 mol% target meets specification."""
        streams = [{"name": "A", "flow_rate": 20.0, "co2_mol_pct": 1.5}]
        result = calculate_blend(streams)

        assert result["blended_co2_mol_pct"] == 1.5
        assert result["meets_target"] is True

    def test_two_stream_simple_blend(self):
        """Two equal-flow streams: blended CO2 is the arithmetic average."""
        streams = [
            {"name": "A", "flow_rate": 10.0, "co2_mol_pct": 4.0},
            {"name": "B", "flow_rate": 10.0, "co2_mol_pct": 2.0},
        ]
        result = calculate_blend(streams)

        assert result["blended_co2_mol_pct"] == 3.0
        assert result["total_flow"] == 20.0

    def test_tc2_haltenbanken_troll_blend(self):
        """TC-2: Stream A (15 MSm3/d, 9% CO2) + Stream B (50 MSm3/d, 1.3% CO2).

        Expected blended CO2: (15*9 + 50*1.3) / (15+50) = (135+65)/65 = 200/65 ~= 3.0769 mol%.
        """
        streams = [
            {"name": "Haltenbanken East", "flow_rate": 15.0, "co2_mol_pct": 9.0},
            {"name": "Troll", "flow_rate": 50.0, "co2_mol_pct": 1.3},
        ]
        result = calculate_blend(streams)

        expected_co2 = (15.0 * 9.0 + 50.0 * 1.3) / (15.0 + 50.0)
        assert result["blended_co2_mol_pct"] == round(expected_co2, 4)
        assert abs(result["blended_co2_mol_pct"] - 3.0769) < 0.001
        assert result["total_flow"] == 65.0
        # 3.077 > 2.5 so does NOT meet target
        assert result["meets_target"] is False

    def test_three_stream_blend(self):
        """Three streams: weighted average CO2."""
        streams = [
            {"name": "A", "flow_rate": 10.0, "co2_mol_pct": 5.0},
            {"name": "B", "flow_rate": 30.0, "co2_mol_pct": 1.0},
            {"name": "C", "flow_rate": 20.0, "co2_mol_pct": 2.0},
        ]
        result = calculate_blend(streams)

        expected = (10 * 5.0 + 30 * 1.0 + 20 * 2.0) / 60.0  # (50+30+40)/60 = 2.0
        assert result["blended_co2_mol_pct"] == round(expected, 4)
        assert result["total_flow"] == 60.0
        assert result["meets_target"] is True

    def test_zero_total_flow(self):
        """All streams with zero flow returns zero."""
        streams = [
            {"name": "A", "flow_rate": 0.0, "co2_mol_pct": 5.0},
            {"name": "B", "flow_rate": 0.0, "co2_mol_pct": 2.0},
        ]
        result = calculate_blend(streams)

        assert result["blended_co2_mol_pct"] == 0.0
        assert result["total_flow"] == 0.0
        assert result["contributions"] == []

    def test_same_co2_streams(self):
        """Blending streams with identical CO2 returns that same CO2."""
        streams = [
            {"name": "A", "flow_rate": 25.0, "co2_mol_pct": 2.0},
            {"name": "B", "flow_rate": 40.0, "co2_mol_pct": 2.0},
        ]
        result = calculate_blend(streams)

        assert result["blended_co2_mol_pct"] == 2.0

    def test_contributions_sum_to_total(self):
        """Contributions flow fractions should sum to 1.0."""
        streams = [
            {"name": "A", "flow_rate": 15.0, "co2_mol_pct": 9.0},
            {"name": "B", "flow_rate": 50.0, "co2_mol_pct": 1.3},
        ]
        result = calculate_blend(streams)

        fraction_sum = sum(c["flow_fraction"] for c in result["contributions"])
        assert abs(fraction_sum - 1.0) < 0.001

    def test_contributions_co2_sum_to_blended(self):
        """Sum of per-stream CO2 contributions should equal blended CO2."""
        streams = [
            {"name": "A", "flow_rate": 15.0, "co2_mol_pct": 9.0},
            {"name": "B", "flow_rate": 50.0, "co2_mol_pct": 1.3},
        ]
        result = calculate_blend(streams)

        co2_sum = sum(c["co2_contribution_mol_pct"] for c in result["contributions"])
        assert abs(co2_sum - result["blended_co2_mol_pct"]) < 0.01

    def test_at_target_exactly(self):
        """CO2 exactly at 2.5 mol% meets target."""
        streams = [{"name": "A", "flow_rate": 10.0, "co2_mol_pct": 2.5}]
        result = calculate_blend(streams)
        assert result["meets_target"] is True


# ---------------------------------------------------------------------------
# required_removal
# ---------------------------------------------------------------------------

class TestRequiredRemoval:
    """Tests for the required_removal function."""

    def test_no_removal_needed(self):
        """CO2 below target requires no removal."""
        result = required_removal(co2_in=1.5, co2_target=2.5, flow_rate=10.0)

        assert result["requires_removal"] is False
        assert result["co2_to_remove_mol_pct"] == 0.0
        assert result["co2_removal_fraction"] == 0.0
        assert result["co2_mass_rate_tonnes_per_day"] == 0.0

    def test_at_target_no_removal(self):
        """CO2 exactly at target requires no removal."""
        result = required_removal(co2_in=2.5, co2_target=2.5, flow_rate=10.0)
        assert result["requires_removal"] is False

    def test_removal_required(self):
        """CO2 above target: verify delta and mass rate calculation."""
        result = required_removal(co2_in=9.0, co2_target=2.5, flow_rate=15.0)

        assert result["requires_removal"] is True
        assert result["co2_to_remove_mol_pct"] == 6.5
        assert abs(result["co2_removal_fraction"] - 6.5 / 9.0) < 0.001

        # Manual mass rate: 15 * 1e6 * (6.5/100) * 1.977 / 1000
        expected_mass = 15.0 * 1e6 * (6.5 / 100.0) * 1.977 / 1000.0
        assert abs(result["co2_mass_rate_tonnes_per_day"] - round(expected_mass, 2)) < 0.01

    def test_small_excess(self):
        """Slightly above target."""
        result = required_removal(co2_in=2.6, co2_target=2.5, flow_rate=50.0)

        assert result["requires_removal"] is True
        assert abs(result["co2_to_remove_mol_pct"] - 0.1) < 0.001


# ---------------------------------------------------------------------------
# blending_ratio_for_target
# ---------------------------------------------------------------------------

class TestBlendingRatioForTarget:
    """Tests for the blending_ratio_for_target function."""

    def test_normal_case(self):
        """High CO2 at 9%, low at 1.3%, target 2.5%.

        r = (9 - 2.5) / (9 - 1.3) = 6.5 / 7.7 = 0.8442 (approx)
        """
        ratio = blending_ratio_for_target(high_co2=9.0, low_co2=1.3, target=2.5)

        expected = (9.0 - 2.5) / (9.0 - 1.3)
        assert abs(ratio - round(expected, 4)) < 0.001

    def test_low_equals_high(self):
        """If low_co2 >= high_co2, infeasible -> returns -1."""
        assert blending_ratio_for_target(high_co2=5.0, low_co2=5.0, target=2.5) == -1.0

    def test_both_above_target(self):
        """Both streams above target: infeasible if low >= target."""
        assert blending_ratio_for_target(high_co2=5.0, low_co2=3.0, target=2.5) == -1.0

    def test_high_below_low(self):
        """High CO2 actually lower than low CO2 -> infeasible."""
        assert blending_ratio_for_target(high_co2=1.0, low_co2=5.0, target=2.5) == -1.0

    def test_target_achievable_edge(self):
        """Target equals the low CO2: ratio should be 1.0 (all low-CO2 gas)."""
        ratio = blending_ratio_for_target(high_co2=5.0, low_co2=2.0, target=2.0)
        # r = (5-2)/(5-2) = 1.0
        assert ratio == 1.0

    def test_target_at_high(self):
        """Target equals the high CO2 stream: ratio is 0 (no dilution needed)."""
        ratio = blending_ratio_for_target(high_co2=5.0, low_co2=1.0, target=5.0)
        assert ratio == 0.0

    def test_ratio_between_zero_and_one(self):
        """Normal blending ratio should be in (0, 1)."""
        ratio = blending_ratio_for_target(high_co2=10.0, low_co2=0.5, target=2.5)
        assert 0.0 < ratio < 1.0
