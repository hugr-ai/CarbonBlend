"""Compute input/output flow balance for a hub facility."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models.co2_spec import CO2Spec
from app.models.facility import Facility
from app.models.pipeline import Pipeline
from app.models.processing_plant import ProcessingPlant
from app.services.network_builder import build_key_network, _is_major_hub

logger = logging.getLogger(__name__)

# Rough capacity estimates based on diameter (MSm3/d)
# Gas: ~0.035 * D^2
_KNOWN_CAPACITIES: dict[str, float] = {
    "LANGELED": 70.0,
    "FRANPIPE": 54.0,
    "ZEEPIPE": 41.0,
    "EUROPIPE": 53.0,
    "NORPIPE": 32.0,
    "STATPIPE": 27.0,
    "ASGARD": 45.0,
    "POLARLED": 36.0,
    "OSEBERG": 18.0,
    "HALTENPIPE": 12.0,
}


def _estimate_flow(pipe_name: str, diameter_inches: float | None) -> float:
    """Estimate flow rate from known data or diameter."""
    upper = (pipe_name or "").upper()
    for key, cap in _KNOWN_CAPACITIES.items():
        if key in upper:
            # Assume ~80% utilization for estimation
            return round(cap * 0.8, 1)
    if diameter_inches:
        capacity = 0.035 * diameter_inches * diameter_inches
        return round(capacity * 0.75, 1)  # ~75% utilization
    return 5.0  # fallback


def compute_hub_balance(
    facility_npdid: int,
    db: Session,
) -> dict[str, Any] | None:
    """Compute the input/output flow balance for a hub facility.

    Returns a dict with hub_name, inputs, outputs, blended CO2, totals.
    """
    # Look up the facility
    facility = (
        db.query(Facility)
        .filter(Facility.npdid_facility == facility_npdid)
        .first()
    )
    if facility is None:
        return None

    hub_name = facility.name or "Unknown"
    node_id = f"facility_{facility_npdid}"

    # Build graph to query edges
    graph = build_key_network(db)

    # Load CO2 specs for fields
    co2_specs = {
        s.entity_name.upper(): s
        for s in db.query(CO2Spec).filter(CO2Spec.entity_type == "field").all()
    }

    # Find all edges into and out of this node
    inputs: list[dict[str, Any]] = []
    outputs: list[dict[str, Any]] = []

    if node_id not in graph:
        # Node not in key network -- still return minimal info
        return {
            "hub_name": hub_name,
            "npdid": facility_npdid,
            "inputs": [],
            "outputs": [],
            "blended_co2_mol_pct": None,
            "total_input_mscm_d": 0.0,
            "total_output_mscm_d": 0.0,
            "co2_removal_at_hub": False,
        }

    # Process incoming edges
    for pred, _, edata in graph.in_edges(node_id, data=True):
        pred_data = graph.nodes.get(pred, {})
        pred_type = pred_data.get("node_type", "facility")
        source_name = pred_data.get("label", pred)
        pipe_name = edata.get("label", "")
        diameter = edata.get("diameter_inches")
        flow = _estimate_flow(pipe_name, diameter)

        # CO2 content
        co2_pct: float | None = None
        if pred_type == "field":
            co2_pct = pred_data.get("co2_mol_pct")
        elif pred_type == "facility":
            # Try to find CO2 from belonging field
            belongs = pred_data.get("label", "")
            spec = co2_specs.get(belongs.upper())
            if spec:
                co2_pct = spec.co2_mol_pct

        inputs.append({
            "source": source_name,
            "type": pred_type,
            "co2_mol_pct": co2_pct,
            "flow_mscm_d": flow,
            "pipeline": pipe_name or None,
        })

    # Process outgoing edges
    for _, succ, edata in graph.out_edges(node_id, data=True):
        succ_data = graph.nodes.get(succ, {})
        succ_type = succ_data.get("node_type", "facility")
        dest_name = succ_data.get("label", succ)
        pipe_name = edata.get("label", "")
        diameter = edata.get("diameter_inches")
        flow = _estimate_flow(pipe_name, diameter)

        outputs.append({
            "destination": dest_name,
            "type": succ_type,
            "co2_mol_pct": None,  # Will be set after blending calc
            "flow_mscm_d": flow,
            "pipeline": pipe_name or None,
        })

    # Calculate blended CO2
    total_input = sum(inp.get("flow_mscm_d", 0) or 0 for inp in inputs)
    total_output = sum(out.get("flow_mscm_d", 0) or 0 for out in outputs)

    blended_co2: float | None = None
    if total_input > 0:
        weighted_sum = sum(
            (inp.get("co2_mol_pct") or 0) * (inp.get("flow_mscm_d") or 0)
            for inp in inputs
        )
        blended_co2 = round(weighted_sum / total_input, 2) if total_input > 0 else None

    # Check if any connected processing plant has CO2 removal
    co2_removal = False
    for _, succ, edata in graph.out_edges(node_id, data=True):
        succ_data = graph.nodes.get(succ, {})
        if succ_data.get("node_type") == "processing_plant":
            if succ_data.get("has_co2_removal"):
                co2_removal = True
                break

    # Set blended CO2 on outputs
    for out in outputs:
        out["co2_mol_pct"] = blended_co2

    # Balance outputs to match inputs
    if total_output > 0 and total_input > 0 and total_output != total_input:
        scale = total_input / total_output
        for out in outputs:
            if out.get("flow_mscm_d"):
                out["flow_mscm_d"] = round(out["flow_mscm_d"] * scale, 1)
        total_output = total_input

    return {
        "hub_name": hub_name,
        "npdid": facility_npdid,
        "inputs": inputs,
        "outputs": outputs,
        "blended_co2_mol_pct": blended_co2,
        "total_input_mscm_d": round(total_input, 1),
        "total_output_mscm_d": round(total_output, 1),
        "co2_removal_at_hub": co2_removal,
    }
