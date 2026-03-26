"""Tests for decision support MCDA, dominance, and weight sensitivity (app.services.decision_support)."""

from __future__ import annotations

import pytest

from app.services.decision_support import (
    compare_scenarios,
    dominance_analysis,
    weight_sensitivity,
)


# ---------------------------------------------------------------------------
# Shared test data
# ---------------------------------------------------------------------------

def _make_scenarios():
    """Two scenarios for MCDA testing."""
    return [
        {
            "name": "Route A",
            "total_cost_mnok": 100.0,
            "co2_removal_cost_mnok": 20.0,
            "tariff_cost_mnok": 30.0,
            "num_feasible_paths": 5,
            "feasibility_pct": 90.0,
            "p50_cost_mnok": 95.0,
        },
        {
            "name": "Route B",
            "total_cost_mnok": 150.0,
            "co2_removal_cost_mnok": 10.0,
            "tariff_cost_mnok": 50.0,
            "num_feasible_paths": 3,
            "feasibility_pct": 80.0,
            "p50_cost_mnok": 140.0,
        },
    ]


def _make_weights():
    return {
        "total_cost_mnok": 0.3,
        "co2_removal_cost_mnok": 0.2,
        "feasibility_pct": 0.3,
        "p50_cost_mnok": 0.2,
    }


# ---------------------------------------------------------------------------
# compare_scenarios
# ---------------------------------------------------------------------------

class TestCompareScenarios:
    """Tests for MCDA weighted scoring."""

    def test_basic_comparison(self):
        """Two scenarios should produce a valid ranking."""
        scenarios = _make_scenarios()
        weights = _make_weights()
        result = compare_scenarios(scenarios, weights)

        assert result["status"] == "ok"
        assert len(result["ranking"]) == 2
        assert result["ranking"][0]["rank"] == 1
        assert result["ranking"][1]["rank"] == 2

    def test_ranking_names(self):
        """All scenario names appear in ranking."""
        scenarios = _make_scenarios()
        weights = _make_weights()
        result = compare_scenarios(scenarios, weights)

        ranked_names = {entry["name"] for entry in result["ranking"]}
        assert ranked_names == {"Route A", "Route B"}

    def test_route_a_preferred(self):
        """Route A has lower total cost and higher feasibility; should rank first
        with cost-heavy weights."""
        scenarios = _make_scenarios()
        weights = {
            "total_cost_mnok": 0.5,
            "co2_removal_cost_mnok": 0.1,
            "feasibility_pct": 0.3,
            "p50_cost_mnok": 0.1,
        }
        result = compare_scenarios(scenarios, weights)

        assert result["ranking"][0]["name"] == "Route A"

    def test_normalized_scores_range(self):
        """Normalized values should be between 0 and 1."""
        scenarios = _make_scenarios()
        weights = _make_weights()
        result = compare_scenarios(scenarios, weights)

        for name, scores in result["normalized_matrix"].items():
            for crit, value in scores.items():
                assert 0.0 <= value <= 1.0, f"{name}/{crit} = {value} out of [0,1]"

    def test_total_scores_in_result(self):
        """Total scores dict should contain both scenario names."""
        scenarios = _make_scenarios()
        weights = _make_weights()
        result = compare_scenarios(scenarios, weights)

        assert "Route A" in result["total_scores"]
        assert "Route B" in result["total_scores"]

    def test_weights_returned(self):
        """The weights used should be returned in the result."""
        scenarios = _make_scenarios()
        weights = _make_weights()
        result = compare_scenarios(scenarios, weights)
        assert result["weights"] == weights

    def test_empty_scenarios(self):
        """Empty scenarios list returns error status."""
        result = compare_scenarios([], {"cost": 1.0})
        assert result["status"] == "error"

    def test_empty_weights(self):
        """Empty weights returns error status."""
        result = compare_scenarios(_make_scenarios(), {})
        assert result["status"] == "error"

    def test_cost_inversion(self):
        """Cost criteria should be inverted: lower cost -> higher normalized score."""
        scenarios = _make_scenarios()
        weights = {"total_cost_mnok": 1.0}
        result = compare_scenarios(scenarios, weights)

        # Route A has lower cost (100 vs 150), so normalized score should be 1.0
        assert result["normalized_matrix"]["Route A"]["total_cost_mnok"] == 1.0
        assert result["normalized_matrix"]["Route B"]["total_cost_mnok"] == 0.0

    def test_benefit_direction(self):
        """Benefit criteria (feasibility_pct): higher is better."""
        scenarios = _make_scenarios()
        weights = {"feasibility_pct": 1.0}
        result = compare_scenarios(scenarios, weights)

        # Route A has 90% vs Route B 80%
        assert result["normalized_matrix"]["Route A"]["feasibility_pct"] == 1.0
        assert result["normalized_matrix"]["Route B"]["feasibility_pct"] == 0.0


# ---------------------------------------------------------------------------
# dominance_analysis
# ---------------------------------------------------------------------------

class TestDominanceAnalysis:
    """Tests for Pareto-optimal (non-dominated) identification."""

    def test_dominated_scenario(self):
        """One scenario dominates the other on all criteria."""
        scenarios = [
            {
                "name": "Good",
                "total_cost_mnok": 50.0,
                "co2_removal_cost_mnok": 5.0,
                "feasibility_pct": 95.0,
            },
            {
                "name": "Bad",
                "total_cost_mnok": 100.0,
                "co2_removal_cost_mnok": 20.0,
                "feasibility_pct": 70.0,
            },
        ]
        result = dominance_analysis(scenarios)

        assert result["status"] == "ok"
        assert "Good" in result["pareto_optimal"]
        assert "Bad" in result["dominated"]
        assert result["num_pareto"] == 1

    def test_pareto_front_both_optimal(self):
        """Neither scenario dominates the other -> both Pareto-optimal."""
        scenarios = [
            {
                "name": "Cheap",
                "total_cost_mnok": 50.0,
                "co2_removal_cost_mnok": 30.0,
                "feasibility_pct": 70.0,
            },
            {
                "name": "Feasible",
                "total_cost_mnok": 80.0,
                "co2_removal_cost_mnok": 5.0,
                "feasibility_pct": 95.0,
            },
        ]
        result = dominance_analysis(scenarios)

        assert result["num_pareto"] == 2
        assert "Cheap" in result["pareto_optimal"]
        assert "Feasible" in result["pareto_optimal"]
        assert len(result["dominated"]) == 0

    def test_three_scenarios_mixed(self):
        """Three scenarios: one dominated, two on Pareto front."""
        scenarios = [
            {
                "name": "A",
                "total_cost_mnok": 50.0,
                "co2_removal_cost_mnok": 10.0,
                "feasibility_pct": 90.0,
            },
            {
                "name": "B",
                "total_cost_mnok": 80.0,
                "co2_removal_cost_mnok": 5.0,
                "feasibility_pct": 95.0,
            },
            {
                "name": "C",
                "total_cost_mnok": 100.0,
                "co2_removal_cost_mnok": 20.0,
                "feasibility_pct": 70.0,
            },
        ]
        result = dominance_analysis(scenarios)

        # C is dominated by A (lower cost, lower removal cost, higher feasibility)
        assert "C" in result["dominated"]
        # A and B are on the Pareto front
        assert "A" in result["pareto_optimal"]
        assert "B" in result["pareto_optimal"]

    def test_identical_scenarios(self):
        """Identical scenarios: neither dominates the other."""
        scenarios = [
            {
                "name": "X",
                "total_cost_mnok": 50.0,
                "co2_removal_cost_mnok": 10.0,
                "feasibility_pct": 90.0,
            },
            {
                "name": "Y",
                "total_cost_mnok": 50.0,
                "co2_removal_cost_mnok": 10.0,
                "feasibility_pct": 90.0,
            },
        ]
        result = dominance_analysis(scenarios)

        assert result["num_pareto"] == 2

    def test_criteria_used(self):
        """Verify the correct criteria are being used."""
        result = dominance_analysis([{"name": "A", "total_cost_mnok": 1.0}])
        assert "total_cost_mnok" in result["criteria"]
        assert "co2_removal_cost_mnok" in result["criteria"]
        assert "feasibility_pct" in result["criteria"]


# ---------------------------------------------------------------------------
# weight_sensitivity
# ---------------------------------------------------------------------------

class TestWeightSensitivity:
    """Tests for weight sensitivity (Monte Carlo over weight space)."""

    def test_basic_sensitivity(self):
        """Weight sensitivity produces stability metrics for each scenario."""
        scenarios = _make_scenarios()
        weight_ranges = {
            "total_cost_mnok": (0.1, 0.5),
            "co2_removal_cost_mnok": (0.05, 0.3),
            "feasibility_pct": (0.1, 0.4),
            "p50_cost_mnok": (0.05, 0.3),
        }
        result = weight_sensitivity(scenarios, weight_ranges, n_samples=50)

        assert result["status"] == "ok"
        assert result["n_samples"] == 50
        assert "Route A" in result["stability"]
        assert "Route B" in result["stability"]

    def test_stability_fields(self):
        """Each stability entry has expected fields."""
        scenarios = _make_scenarios()
        weight_ranges = {
            "total_cost_mnok": (0.2, 0.4),
            "feasibility_pct": (0.2, 0.4),
        }
        result = weight_sensitivity(scenarios, weight_ranges, n_samples=30)

        for name, stability in result["stability"].items():
            assert "most_frequent_rank" in stability
            assert "frequency_pct" in stability
            assert "win_pct" in stability
            assert "rank_distribution" in stability

    def test_win_percentages_sum(self):
        """Win percentages across all scenarios should sum to approximately 100%."""
        scenarios = _make_scenarios()
        weight_ranges = {
            "total_cost_mnok": (0.2, 0.5),
            "feasibility_pct": (0.2, 0.5),
        }
        result = weight_sensitivity(scenarios, weight_ranges, n_samples=100)

        total_win_pct = sum(
            s["win_pct"] for s in result["stability"].values()
        )
        assert abs(total_win_pct - 100.0) < 5.0  # Allow small rounding error

    def test_deterministic_with_seed(self):
        """Results should be reproducible (internal seed=42)."""
        scenarios = _make_scenarios()
        weight_ranges = {
            "total_cost_mnok": (0.2, 0.4),
            "feasibility_pct": (0.3, 0.5),
        }
        r1 = weight_sensitivity(scenarios, weight_ranges, n_samples=50)
        r2 = weight_sensitivity(scenarios, weight_ranges, n_samples=50)

        assert r1["stability"]["Route A"]["win_pct"] == r2["stability"]["Route A"]["win_pct"]
