"""CO2 blending calculations for gas stream mixing and removal requirements."""

from __future__ import annotations

from typing import Any


def calculate_blend(streams: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate the resulting CO2 concentration from blending multiple gas streams.

    Args:
        streams: List of dicts with keys:
            - name: str
            - flow_rate: float (MSm3/d)
            - co2_mol_pct: float (mol%)

    Returns:
        Dict with blended_co2_mol_pct, total_flow, meets_target (at 2.5 mol%),
        and per-stream contributions.
    """
    if not streams:
        return {
            "blended_co2_mol_pct": 0.0,
            "total_flow": 0.0,
            "meets_target": True,
            "target_co2_mol_pct": 2.5,
            "contributions": [],
        }

    total_flow = sum(s["flow_rate"] for s in streams)
    if total_flow <= 0:
        return {
            "blended_co2_mol_pct": 0.0,
            "total_flow": 0.0,
            "meets_target": True,
            "target_co2_mol_pct": 2.5,
            "contributions": [],
        }

    # Weighted average CO2 concentration
    total_co2_flow = sum(s["flow_rate"] * s["co2_mol_pct"] for s in streams)
    blended_co2 = total_co2_flow / total_flow

    # Default Gassled CO2 entry spec
    target = 2.5

    contributions = []
    for s in streams:
        frac = s["flow_rate"] / total_flow
        contributions.append(
            {
                "name": s["name"],
                "flow_rate": s["flow_rate"],
                "co2_mol_pct": s["co2_mol_pct"],
                "flow_fraction": round(frac, 4),
                "co2_contribution_mol_pct": round(frac * s["co2_mol_pct"], 4),
            }
        )

    return {
        "blended_co2_mol_pct": round(blended_co2, 4),
        "total_flow": round(total_flow, 4),
        "meets_target": blended_co2 <= target,
        "target_co2_mol_pct": target,
        "contributions": contributions,
    }


def required_removal(
    co2_in: float, co2_target: float, flow_rate: float
) -> dict[str, Any]:
    """Calculate how much CO2 must be removed to meet a target specification.

    Args:
        co2_in: Inlet CO2 concentration (mol%)
        co2_target: Target CO2 concentration (mol%)
        flow_rate: Gas flow rate (MSm3/d)

    Returns:
        Dict with co2_to_remove_mol_pct, co2_removal_fraction,
        co2_mass_rate_tonnes_per_day (approximate).
    """
    if co2_in <= co2_target:
        return {
            "co2_to_remove_mol_pct": 0.0,
            "co2_removal_fraction": 0.0,
            "co2_mass_rate_tonnes_per_day": 0.0,
            "requires_removal": False,
        }

    delta = co2_in - co2_target
    removal_fraction = delta / co2_in

    # Approximate CO2 mass: 1 MSm3/d of gas ~ 1e6 Sm3/d
    # At co2_in mol%, CO2 volume = flow_rate * 1e6 * co2_in/100 Sm3/d
    # CO2 density at STP ~ 1.977 kg/Sm3
    # Mass to remove = flow_rate * 1e6 * delta/100 * 1.977 / 1000 tonnes/d
    co2_mass_rate = flow_rate * 1e6 * (delta / 100.0) * 1.977 / 1000.0

    return {
        "co2_to_remove_mol_pct": round(delta, 4),
        "co2_removal_fraction": round(removal_fraction, 4),
        "co2_mass_rate_tonnes_per_day": round(co2_mass_rate, 2),
        "requires_removal": True,
    }


def blending_ratio_for_target(
    high_co2: float, low_co2: float, target: float
) -> float:
    """Calculate the required ratio of low-CO2 gas to meet a target blend.

    Uses linear mixing:  target = high_co2 * (1 - r) + low_co2 * r
    Solving:  r = (high_co2 - target) / (high_co2 - low_co2)

    Args:
        high_co2: CO2 mol% of the high-CO2 stream
        low_co2: CO2 mol% of the low-CO2 stream
        target: Target blended CO2 mol%

    Returns:
        Fraction of total flow that must be the low-CO2 stream (0-1).
        Returns -1 if infeasible (both streams above target, or low >= high).
    """
    if high_co2 <= low_co2:
        return -1.0
    if low_co2 >= target:
        # low_co2 is already at or above target; check if high also is
        if high_co2 <= target:
            return 0.0  # No low-CO2 gas needed
    if low_co2 > target:
        return -1.0  # Cannot blend below target if both are above

    ratio = (high_co2 - target) / (high_co2 - low_co2)
    if ratio < 0.0 or ratio > 1.0:
        return -1.0
    return round(ratio, 4)
