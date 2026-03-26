"""Auto-generate risk register from optimization and uncertainty results."""

from __future__ import annotations

from typing import Any


def generate_risk_register(
    optimization_result: dict[str, Any],
    uncertainty_result: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Auto-generate risks from tight constraints and high-sensitivity parameters.

    Analyzes optimization results and uncertainty analysis to identify key risks.

    Args:
        optimization_result: Output from optimizer.optimize_existing().
        uncertainty_result: Output from uncertainty.run_monte_carlo() or run_tornado().

    Returns:
        List of risk dicts, each with category, description, likelihood,
        impact, mitigation, and risk_score.
    """
    risks: list[dict[str, Any]] = []
    risk_id = 1

    # --- Risks from optimization results ---
    pathways = optimization_result.get("pathways", [])
    co2_mol_pct = optimization_result.get("co2_mol_pct", 0)
    co2_target = optimization_result.get("co2_target_mol_pct", 2.5)

    # R1: No feasible pathways
    if not pathways:
        risks.append(
            {
                "id": f"R{risk_id:03d}",
                "category": "Technical",
                "description": "No feasible gas export pathway found in existing infrastructure",
                "likelihood": "High",
                "impact": "Critical",
                "risk_score": 25,
                "mitigation": "Evaluate bridge infrastructure options; consider CO2 removal or blending with low-CO2 fields",
            }
        )
        risk_id += 1

    # R2: High CO2 requiring significant removal
    if co2_mol_pct > co2_target:
        excess = co2_mol_pct - co2_target
        severity = "High" if excess > 3.0 else "Medium" if excess > 1.0 else "Low"
        risks.append(
            {
                "id": f"R{risk_id:03d}",
                "category": "Technical",
                "description": (
                    f"CO2 concentration ({co2_mol_pct} mol%) exceeds pipeline entry spec "
                    f"({co2_target} mol%) by {excess:.1f} mol%; removal required"
                ),
                "likelihood": "High",
                "impact": severity,
                "risk_score": _score(likelihood="High", impact=severity),
                "mitigation": "Install CO2 removal (amine scrubbing or membrane); explore blending opportunities with nearby low-CO2 fields",
            }
        )
        risk_id += 1

    # R3: CO2 removal cost dominates pathway economics
    if pathways:
        best = pathways[0]
        if best.get("co2_removal_cost_mnok_yr", 0) > best.get("annual_tariff_mnok", 0) * 0.5:
            risks.append(
                {
                    "id": f"R{risk_id:03d}",
                    "category": "Commercial",
                    "description": "CO2 removal cost is a significant fraction of total transport cost",
                    "likelihood": "Medium",
                    "impact": "High",
                    "risk_score": _score("Medium", "High"),
                    "mitigation": "Optimize removal technology selection; evaluate partial removal with blending; consider CO2 storage credit (CCS)",
                }
            )
            risk_id += 1

    # R4: Limited pathway diversity
    if 0 < len(pathways) <= 2:
        risks.append(
            {
                "id": f"R{risk_id:03d}",
                "category": "Operational",
                "description": "Limited number of feasible export pathways reduces operational flexibility",
                "likelihood": "Medium",
                "impact": "Medium",
                "risk_score": _score("Medium", "Medium"),
                "mitigation": "Evaluate bridge infrastructure to create additional routes; assess capacity sharing agreements",
            }
        )
        risk_id += 1

    # R5: Pipeline capacity constraints (if pathway uses many hops)
    if pathways and pathways[0].get("num_hops", 0) > 5:
        risks.append(
            {
                "id": f"R{risk_id:03d}",
                "category": "Operational",
                "description": "Best pathway involves many pipeline segments, increasing exposure to UMM events",
                "likelihood": "Medium",
                "impact": "Medium",
                "risk_score": _score("Medium", "Medium"),
                "mitigation": "Monitor UMM feed for planned maintenance; develop contingency routing plans",
            }
        )
        risk_id += 1

    # --- Risks from uncertainty analysis ---
    if uncertainty_result:
        stats = uncertainty_result.get("statistics", {})
        feasibility_pct = uncertainty_result.get("feasibility_pct", 100)

        # R6: Low feasibility under uncertainty
        if feasibility_pct < 90:
            risks.append(
                {
                    "id": f"R{risk_id:03d}",
                    "category": "Technical",
                    "description": (
                        f"Only {feasibility_pct}% of Monte Carlo scenarios produce feasible pathways"
                    ),
                    "likelihood": "Medium",
                    "impact": "High",
                    "risk_score": _score("Medium", "High"),
                    "mitigation": "Reduce parameter uncertainty through appraisal; implement robust design margins",
                }
            )
            risk_id += 1

        # R7: Wide cost spread
        if stats:
            p10 = stats.get("p10", 0)
            p90 = stats.get("p90", 0)
            spread = p90 - p10
            mean_cost = stats.get("mean", 1)
            if mean_cost > 0 and spread / mean_cost > 0.5:
                risks.append(
                    {
                        "id": f"R{risk_id:03d}",
                        "category": "Commercial",
                        "description": (
                            f"Wide cost uncertainty: P10={p10:.0f} MNOK, P90={p90:.0f} MNOK "
                            f"(spread {spread:.0f} MNOK, {spread/mean_cost*100:.0f}% of mean)"
                        ),
                        "likelihood": "Medium",
                        "impact": "High",
                        "risk_score": _score("Medium", "High"),
                        "mitigation": "Identify and reduce highest-sensitivity parameters; phase investments; include cost contingency",
                    }
                )
                risk_id += 1

        # Tornado-based risks
        sensitivities = uncertainty_result.get("sensitivities", [])
        for sens in sensitivities[:2]:  # Top 2 most sensitive
            if sens.get("swing_mnok", 0) > 10:
                risks.append(
                    {
                        "id": f"R{risk_id:03d}",
                        "category": "Commercial",
                        "description": (
                            f"High sensitivity to {sens['parameter']}: "
                            f"cost swing of {sens['swing_mnok']:.0f} MNOK"
                        ),
                        "likelihood": "Medium",
                        "impact": "Medium",
                        "risk_score": _score("Medium", "Medium"),
                        "mitigation": f"Reduce uncertainty in {sens['parameter']}; implement hedging strategies",
                    }
                )
                risk_id += 1

    # R-Generic: Regulatory / market risks
    risks.append(
        {
            "id": f"R{risk_id:03d}",
            "category": "Regulatory",
            "description": "Changes to Gassled tariff regime or CO2 entry specifications",
            "likelihood": "Low",
            "impact": "High",
            "risk_score": _score("Low", "High"),
            "mitigation": "Monitor MPE/Gassco regulatory announcements; maintain flexibility in field development plan",
        }
    )
    risk_id += 1

    risks.append(
        {
            "id": f"R{risk_id:03d}",
            "category": "Market",
            "description": "European gas price volatility affecting project economics",
            "likelihood": "High",
            "impact": "Medium",
            "risk_score": _score("High", "Medium"),
            "mitigation": "Diversify export terminals; consider long-term gas sales agreements; maintain pricing optionality",
        }
    )

    return risks


def _score(likelihood: str, impact: str) -> int:
    """Calculate a simple risk score (1-25 scale)."""
    likelihood_map = {"Low": 1, "Medium": 3, "High": 5}
    impact_map = {"Low": 1, "Medium": 3, "High": 5, "Critical": 5}
    return likelihood_map.get(likelihood, 3) * impact_map.get(impact, 3)
