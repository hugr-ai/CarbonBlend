"""Uncertainty analysis: Monte Carlo simulation, tornado diagrams, spider plots."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from scipy import stats
import networkx as nx
from sqlalchemy.orm import Session

from app.services.optimizer import optimize_existing

logger = logging.getLogger(__name__)


def run_monte_carlo(
    scenario_config: dict[str, Any],
    network: nx.DiGraph,
    db: Session,
    n_iterations: int = 1000,
) -> dict[str, Any]:
    """Run Monte Carlo simulation over uncertain parameters.

    Samples uncertain parameters from their distributions and runs the optimizer
    for each iteration to build a cost distribution.

    Args:
        scenario_config: Dict with source_field_npdid, gas_flow_rate, co2_mol_pct,
            and optional 'uncertainties' dict mapping param names to distributions.
        network: Infrastructure graph.
        db: Database session.
        n_iterations: Number of Monte Carlo iterations.

    Returns:
        Dict with cost distribution statistics (P10, P50, P90, mean, std),
        and per-iteration results.
    """
    base_flow = scenario_config["gas_flow_rate"]
    base_co2 = scenario_config["co2_mol_pct"]
    field_npdid = scenario_config["source_field_npdid"]

    uncertainties = scenario_config.get("uncertainties", {})

    # Default uncertainty ranges if not specified
    flow_std = uncertainties.get("gas_flow_rate_std", base_flow * 0.1)
    co2_std = uncertainties.get("co2_mol_pct_std", base_co2 * 0.15)
    tariff_std_frac = uncertainties.get("tariff_std_fraction", 0.1)

    rng = np.random.default_rng(seed=42)
    costs: list[float] = []
    iteration_results: list[dict[str, Any]] = []

    for i in range(n_iterations):
        # Sample parameters
        sampled_flow = max(0.1, rng.normal(base_flow, flow_std))
        sampled_co2 = max(0.01, rng.normal(base_co2, co2_std))

        result = optimize_existing(
            source_field_npdid=field_npdid,
            gas_flow_rate=sampled_flow,
            co2_mol_pct=sampled_co2,
            network=network,
            db=db,
        )

        if result["pathways"]:
            best_cost = result["pathways"][0]["total_annual_cost_mnok"]
        else:
            best_cost = float("inf")

        costs.append(best_cost)
        if i < 50:  # Store first 50 detailed results
            iteration_results.append(
                {
                    "iteration": i,
                    "gas_flow_rate": round(sampled_flow, 4),
                    "co2_mol_pct": round(sampled_co2, 4),
                    "best_cost_mnok": round(best_cost, 2),
                    "num_feasible_paths": len(result["pathways"]),
                }
            )

    finite_costs = [c for c in costs if np.isfinite(c)]
    if not finite_costs:
        return {
            "status": "no_feasible_paths",
            "n_iterations": n_iterations,
            "n_feasible": 0,
        }

    cost_array = np.array(finite_costs)

    return {
        "status": "ok",
        "n_iterations": n_iterations,
        "n_feasible": len(finite_costs),
        "feasibility_pct": round(len(finite_costs) / n_iterations * 100, 1),
        "statistics": {
            "mean": round(float(np.mean(cost_array)), 2),
            "std": round(float(np.std(cost_array)), 2),
            "min": round(float(np.min(cost_array)), 2),
            "max": round(float(np.max(cost_array)), 2),
            "p10": round(float(np.percentile(cost_array, 10)), 2),
            "p50": round(float(np.percentile(cost_array, 50)), 2),
            "p90": round(float(np.percentile(cost_array, 90)), 2),
        },
        "histogram": _build_histogram(cost_array, bins=20),
        "sample_iterations": iteration_results,
    }


def run_tornado(
    scenario_config: dict[str, Any],
    network: nx.DiGraph,
    db: Session,
) -> dict[str, Any]:
    """Run tornado (sensitivity) analysis.

    Varies each parameter +/- 1 sigma from base case and records impact on cost.

    Returns:
        Dict with ranked parameter sensitivities for tornado diagram.
    """
    base_flow = scenario_config["gas_flow_rate"]
    base_co2 = scenario_config["co2_mol_pct"]
    field_npdid = scenario_config["source_field_npdid"]

    # Get base case cost
    base_result = optimize_existing(
        field_npdid, base_flow, base_co2, network, db
    )
    if not base_result["pathways"]:
        return {"status": "no_feasible_paths", "sensitivities": []}

    base_cost = base_result["pathways"][0]["total_annual_cost_mnok"]

    # Define parameters and their variations
    params = [
        {
            "name": "gas_flow_rate",
            "unit": "MSm3/d",
            "base": base_flow,
            "low": base_flow * 0.8,
            "high": base_flow * 1.2,
        },
        {
            "name": "co2_mol_pct",
            "unit": "mol%",
            "base": base_co2,
            "low": base_co2 * 0.7,
            "high": base_co2 * 1.3,
        },
    ]

    sensitivities: list[dict[str, Any]] = []

    for param in params:
        # Low case
        flow = param["low"] if param["name"] == "gas_flow_rate" else base_flow
        co2 = param["low"] if param["name"] == "co2_mol_pct" else base_co2

        low_result = optimize_existing(field_npdid, flow, co2, network, db)
        low_cost = (
            low_result["pathways"][0]["total_annual_cost_mnok"]
            if low_result["pathways"]
            else base_cost
        )

        # High case
        flow = param["high"] if param["name"] == "gas_flow_rate" else base_flow
        co2 = param["high"] if param["name"] == "co2_mol_pct" else base_co2

        high_result = optimize_existing(field_npdid, flow, co2, network, db)
        high_cost = (
            high_result["pathways"][0]["total_annual_cost_mnok"]
            if high_result["pathways"]
            else base_cost
        )

        swing = abs(high_cost - low_cost)
        sensitivities.append(
            {
                "parameter": param["name"],
                "unit": param["unit"],
                "base_value": param["base"],
                "low_value": param["low"],
                "high_value": param["high"],
                "low_cost_mnok": round(low_cost, 2),
                "high_cost_mnok": round(high_cost, 2),
                "swing_mnok": round(swing, 2),
            }
        )

    # Rank by swing (descending)
    sensitivities.sort(key=lambda s: s["swing_mnok"], reverse=True)

    return {
        "status": "ok",
        "base_cost_mnok": round(base_cost, 2),
        "sensitivities": sensitivities,
    }


def run_spider(
    scenario_config: dict[str, Any],
    network: nx.DiGraph,
    db: Session,
    param_name: str,
) -> dict[str, Any]:
    """Run spider plot analysis: vary one parameter across its range.

    Args:
        scenario_config: Base scenario configuration.
        network: Infrastructure graph.
        db: Database session.
        param_name: Which parameter to vary ("gas_flow_rate" or "co2_mol_pct").

    Returns:
        Dict with parameter values and corresponding costs for plotting.
    """
    base_flow = scenario_config["gas_flow_rate"]
    base_co2 = scenario_config["co2_mol_pct"]
    field_npdid = scenario_config["source_field_npdid"]

    if param_name == "gas_flow_rate":
        values = np.linspace(base_flow * 0.5, base_flow * 1.5, 11).tolist()
    elif param_name == "co2_mol_pct":
        values = np.linspace(max(0.1, base_co2 * 0.3), min(15.0, base_co2 * 2.0), 11).tolist()
    else:
        return {"status": "error", "message": f"Unknown parameter: {param_name}"}

    points: list[dict[str, Any]] = []

    for val in values:
        flow = val if param_name == "gas_flow_rate" else base_flow
        co2 = val if param_name == "co2_mol_pct" else base_co2

        result = optimize_existing(field_npdid, flow, co2, network, db)
        cost = (
            result["pathways"][0]["total_annual_cost_mnok"]
            if result["pathways"]
            else None
        )
        points.append(
            {
                "param_value": round(val, 4),
                "cost_mnok": round(cost, 2) if cost is not None else None,
                "feasible": cost is not None,
            }
        )

    return {
        "status": "ok",
        "parameter": param_name,
        "base_value": base_flow if param_name == "gas_flow_rate" else base_co2,
        "points": points,
    }


def _build_histogram(
    data: np.ndarray, bins: int = 20
) -> list[dict[str, Any]]:
    """Build histogram data for frontend visualization."""
    counts, bin_edges = np.histogram(data, bins=bins)
    return [
        {
            "bin_low": round(float(bin_edges[i]), 2),
            "bin_high": round(float(bin_edges[i + 1]), 2),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]
