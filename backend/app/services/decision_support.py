"""Decision support: MCDA, Pareto analysis, weight sensitivity, VOI."""

from __future__ import annotations

from typing import Any

import numpy as np


def compare_scenarios(
    scenarios: list[dict[str, Any]],
    weights: dict[str, float],
) -> dict[str, Any]:
    """Multi-criteria decision analysis (MCDA) with weighted scoring.

    Creates a Pugh-style comparison matrix across all criteria.

    Args:
        scenarios: List of scenario dicts, each with 'name' and criteria values.
            Expected criteria keys: total_cost_mnok, co2_removal_cost_mnok,
            tariff_cost_mnok, num_feasible_paths, feasibility_pct, p50_cost_mnok.
        weights: Dict mapping criteria names to weights (should sum to 1.0).

    Returns:
        Dict with Pugh matrix, normalized scores, weighted scores, and ranking.
    """
    if not scenarios or not weights:
        return {"status": "error", "message": "Need scenarios and weights"}

    criteria = list(weights.keys())

    # Extract raw values
    raw_matrix: dict[str, dict[str, float]] = {}
    for scen in scenarios:
        name = scen["name"]
        raw_matrix[name] = {}
        for crit in criteria:
            raw_matrix[name][crit] = scen.get(crit, 0.0) or 0.0

    # Normalize each criterion to 0-1 range
    # For costs: lower is better (invert), for benefits: higher is better
    cost_criteria = {
        "total_cost_mnok", "co2_removal_cost_mnok", "tariff_cost_mnok", "p50_cost_mnok"
    }

    normalized: dict[str, dict[str, float]] = {}
    for crit in criteria:
        values = [raw_matrix[s["name"]][crit] for s in scenarios]
        vmin, vmax = min(values), max(values)
        span = vmax - vmin if vmax != vmin else 1.0

        for scen in scenarios:
            name = scen["name"]
            if name not in normalized:
                normalized[name] = {}
            raw_val = raw_matrix[name][crit]
            norm_val = (raw_val - vmin) / span

            # Invert for cost criteria (lower is better -> higher score)
            if crit in cost_criteria:
                norm_val = 1.0 - norm_val

            normalized[name][crit] = round(norm_val, 4)

    # Weighted scores
    weighted_scores: dict[str, dict[str, float]] = {}
    total_scores: dict[str, float] = {}
    for scen in scenarios:
        name = scen["name"]
        weighted_scores[name] = {}
        total = 0.0
        for crit in criteria:
            ws = normalized[name][crit] * weights[crit]
            weighted_scores[name][crit] = round(ws, 4)
            total += ws
        total_scores[name] = round(total, 4)

    # Rank
    ranking = sorted(total_scores.items(), key=lambda x: x[1], reverse=True)

    return {
        "status": "ok",
        "criteria": criteria,
        "weights": weights,
        "raw_matrix": raw_matrix,
        "normalized_matrix": normalized,
        "weighted_scores": weighted_scores,
        "total_scores": total_scores,
        "ranking": [{"rank": i + 1, "name": name, "score": score} for i, (name, score) in enumerate(ranking)],
    }


def dominance_analysis(scenarios: list[dict[str, Any]]) -> dict[str, Any]:
    """Find Pareto-optimal (non-dominated) concepts.

    A scenario is Pareto-optimal if no other scenario is better on all criteria.

    Args:
        scenarios: List of scenario dicts with criteria values.

    Returns:
        Dict with pareto_optimal and dominated scenarios.
    """
    criteria = ["total_cost_mnok", "co2_removal_cost_mnok", "feasibility_pct"]
    # Directions: cost minimize, feasibility maximize
    minimize = {"total_cost_mnok", "co2_removal_cost_mnok"}

    pareto: list[str] = []
    dominated: list[str] = []

    for i, s1 in enumerate(scenarios):
        is_dominated = False
        for j, s2 in enumerate(scenarios):
            if i == j:
                continue
            # Check if s2 dominates s1
            all_better_or_equal = True
            strictly_better = False
            for crit in criteria:
                v1 = s1.get(crit, 0.0) or 0.0
                v2 = s2.get(crit, 0.0) or 0.0
                if crit in minimize:
                    if v2 > v1:
                        all_better_or_equal = False
                    if v2 < v1:
                        strictly_better = True
                else:
                    if v2 < v1:
                        all_better_or_equal = False
                    if v2 > v1:
                        strictly_better = True

            if all_better_or_equal and strictly_better:
                is_dominated = True
                break

        name = s1.get("name", f"Scenario_{i}")
        if is_dominated:
            dominated.append(name)
        else:
            pareto.append(name)

    return {
        "status": "ok",
        "criteria": criteria,
        "pareto_optimal": pareto,
        "dominated": dominated,
        "num_pareto": len(pareto),
        "num_total": len(scenarios),
    }


def weight_sensitivity(
    scenarios: list[dict[str, Any]],
    weight_ranges: dict[str, tuple[float, float]],
    n_samples: int = 100,
) -> dict[str, Any]:
    """Analyze how ranking changes with weight adjustments.

    Randomly samples weight vectors within given ranges and re-ranks.

    Args:
        scenarios: List of scenario dicts.
        weight_ranges: Dict mapping criteria to (min_weight, max_weight) tuples.
        n_samples: Number of random weight vectors to sample.

    Returns:
        Dict with rank stability per scenario and weight sensitivity.
    """
    criteria = list(weight_ranges.keys())
    rng = np.random.default_rng(seed=42)

    rank_counts: dict[str, dict[int, int]] = {
        s["name"]: {r: 0 for r in range(1, len(scenarios) + 1)}
        for s in scenarios
    }
    win_counts: dict[str, int] = {s["name"]: 0 for s in scenarios}

    for _ in range(n_samples):
        # Sample weights within ranges
        raw_weights = {}
        for crit in criteria:
            lo, hi = weight_ranges[crit]
            raw_weights[crit] = rng.uniform(lo, hi)

        # Normalize to sum to 1
        total = sum(raw_weights.values())
        if total == 0:
            continue
        weights = {k: v / total for k, v in raw_weights.items()}

        result = compare_scenarios(scenarios, weights)
        if result.get("status") != "ok":
            continue

        for entry in result["ranking"]:
            rank_counts[entry["name"]][entry["rank"]] += 1
            if entry["rank"] == 1:
                win_counts[entry["name"]] += 1

    # Calculate rank stability (% of samples at most frequent rank)
    stability: dict[str, Any] = {}
    for name, counts in rank_counts.items():
        most_frequent_rank = max(counts, key=counts.get)  # type: ignore
        stability[name] = {
            "most_frequent_rank": most_frequent_rank,
            "frequency_pct": round(counts[most_frequent_rank] / n_samples * 100, 1),
            "win_pct": round(win_counts[name] / n_samples * 100, 1),
            "rank_distribution": counts,
        }

    return {
        "status": "ok",
        "n_samples": n_samples,
        "weight_ranges": {k: list(v) for k, v in weight_ranges.items()},
        "stability": stability,
    }


def value_of_information(
    scenario: dict[str, Any],
    uncertain_params: dict[str, dict[str, float]],
) -> dict[str, Any]:
    """Calculate Value of Information (VOI) per uncertain parameter.

    Estimates how much the expected cost would decrease if a parameter
    were known with certainty.

    Args:
        scenario: Scenario dict with base values and cost.
        uncertain_params: Dict mapping param names to {mean, std, impact_per_unit}.

    Returns:
        Dict with VOI per parameter, ranked by value.
    """
    base_cost = scenario.get("total_cost_mnok", 0)

    voi_results: list[dict[str, Any]] = []

    for param_name, param_info in uncertain_params.items():
        std = param_info.get("std", 0)
        impact = param_info.get("impact_per_unit", 0)

        # Simplified VOI: expected reduction in cost variance
        # VOI ~ 0.5 * std * abs(impact) (normal distribution approximation)
        voi = 0.5 * std * abs(impact)

        voi_results.append(
            {
                "parameter": param_name,
                "current_std": std,
                "impact_per_unit": impact,
                "voi_mnok": round(voi, 2),
                "voi_as_pct_of_cost": round(voi / base_cost * 100, 2) if base_cost > 0 else 0,
            }
        )

    voi_results.sort(key=lambda v: v["voi_mnok"], reverse=True)

    return {
        "status": "ok",
        "base_cost_mnok": base_cost,
        "parameters": voi_results,
        "total_voi_mnok": round(sum(v["voi_mnok"] for v in voi_results), 2),
    }
