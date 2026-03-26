"""Scenario CRUD API endpoints."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.models.scenario import Scenario

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


# --- Schemas ---

class ScenarioCreate(BaseModel):
    name: str
    description: str | None = None
    source_field_npdid: int | None = None
    gas_flow_rate_mscm_d: float | None = None
    co2_mol_pct: float | None = None
    config_json: dict[str, Any] | None = None


class ScenarioUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    source_field_npdid: int | None = None
    gas_flow_rate_mscm_d: float | None = None
    co2_mol_pct: float | None = None
    config_json: dict[str, Any] | None = None
    result_json: dict[str, Any] | None = None


class ScenarioOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    source_field_npdid: int | None = None
    gas_flow_rate_mscm_d: float | None = None
    co2_mol_pct: float | None = None
    created_at: str
    updated_at: str
    config_json: dict[str, Any] | None = None
    result_json: dict[str, Any] | None = None

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.get("", response_model=list[ScenarioOut])
def list_scenarios(db: Session = Depends(get_db)) -> list[ScenarioOut]:
    """List all saved scenarios."""
    scenarios = db.query(Scenario).order_by(Scenario.updated_at.desc()).all()
    return [_to_out(s) for s in scenarios]


@router.post("", response_model=ScenarioOut, status_code=201)
def create_scenario(
    body: ScenarioCreate,
    db: Session = Depends(get_db),
) -> ScenarioOut:
    """Create a new scenario."""
    now = datetime.now(timezone.utc).isoformat()
    scenario = Scenario(
        id=str(uuid.uuid4()),
        name=body.name,
        description=body.description,
        source_field_npdid=body.source_field_npdid,
        gas_flow_rate_mscm_d=body.gas_flow_rate_mscm_d,
        co2_mol_pct=body.co2_mol_pct,
        created_at=now,
        updated_at=now,
        config_json=json.dumps(body.config_json) if body.config_json else None,
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return _to_out(scenario)


@router.get("/{scenario_id}", response_model=ScenarioOut)
def get_scenario(scenario_id: str, db: Session = Depends(get_db)) -> ScenarioOut:
    """Get a single scenario."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return _to_out(scenario)


@router.put("/{scenario_id}", response_model=ScenarioOut)
def update_scenario(
    scenario_id: str,
    body: ScenarioUpdate,
    db: Session = Depends(get_db),
) -> ScenarioOut:
    """Update a scenario."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    if body.name is not None:
        scenario.name = body.name
    if body.description is not None:
        scenario.description = body.description
    if body.source_field_npdid is not None:
        scenario.source_field_npdid = body.source_field_npdid
    if body.gas_flow_rate_mscm_d is not None:
        scenario.gas_flow_rate_mscm_d = body.gas_flow_rate_mscm_d
    if body.co2_mol_pct is not None:
        scenario.co2_mol_pct = body.co2_mol_pct
    if body.config_json is not None:
        scenario.config_json = json.dumps(body.config_json)
    if body.result_json is not None:
        scenario.result_json = json.dumps(body.result_json)

    scenario.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(scenario)
    return _to_out(scenario)


@router.delete("/{scenario_id}", status_code=204)
def delete_scenario(scenario_id: str, db: Session = Depends(get_db)) -> None:
    """Delete a scenario."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    db.delete(scenario)
    db.commit()


def _to_out(scenario: Scenario) -> ScenarioOut:
    """Convert DB model to output schema, parsing JSON strings."""
    config = None
    if scenario.config_json:
        try:
            config = json.loads(scenario.config_json)
        except (json.JSONDecodeError, TypeError):
            config = None

    result = None
    if scenario.result_json:
        try:
            result = json.loads(scenario.result_json)
        except (json.JSONDecodeError, TypeError):
            result = None

    return ScenarioOut(
        id=scenario.id,
        name=scenario.name,
        description=scenario.description,
        source_field_npdid=scenario.source_field_npdid,
        gas_flow_rate_mscm_d=scenario.gas_flow_rate_mscm_d,
        co2_mol_pct=scenario.co2_mol_pct,
        created_at=scenario.created_at,
        updated_at=scenario.updated_at,
        config_json=config,
        result_json=result,
    )
