"""Uncertainty analysis and risk register API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.models.scenario import Scenario
from app.services.network_builder import build_network
from app.services.uncertainty import run_monte_carlo, run_tornado
from app.services.risk_register import generate_risk_register
from app.services.optimizer import optimize_existing

router = APIRouter(prefix="/api", tags=["uncertainty"])


# --- Schemas ---

class MonteCarloRequest(BaseModel):
    source_field_npdid: int
    gas_flow_rate: float
    co2_mol_pct: float
    n_iterations: int = 1000
    uncertainties: dict[str, float] | None = None


class TornadoRequest(BaseModel):
    source_field_npdid: int
    gas_flow_rate: float
    co2_mol_pct: float


class HistogramBin(BaseModel):
    bin_low: float
    bin_high: float
    count: int


class MonteCarloStats(BaseModel):
    mean: float
    std: float
    min: float
    max: float
    p10: float
    p50: float
    p90: float


class MonteCarloResponse(BaseModel):
    status: str
    n_iterations: int
    n_feasible: int = 0
    feasibility_pct: float = 0.0
    statistics: MonteCarloStats | None = None
    histogram: list[HistogramBin] = []
    sample_iterations: list[dict[str, Any]] = []


class Sensitivity(BaseModel):
    parameter: str
    unit: str
    base_value: float
    low_value: float
    high_value: float
    low_cost_mnok: float
    high_cost_mnok: float
    swing_mnok: float


class TornadoResponse(BaseModel):
    status: str
    base_cost_mnok: float = 0.0
    sensitivities: list[Sensitivity] = []


class Risk(BaseModel):
    id: str
    category: str
    description: str
    likelihood: str
    impact: str
    risk_score: int
    mitigation: str


# --- Endpoints ---

@router.post("/uncertainty/monte-carlo", response_model=MonteCarloResponse)
def run_monte_carlo_analysis(
    request: MonteCarloRequest,
    db: Session = Depends(get_db),
) -> MonteCarloResponse:
    """Run Monte Carlo uncertainty analysis."""
    network = build_network(db)
    config = {
        "source_field_npdid": request.source_field_npdid,
        "gas_flow_rate": request.gas_flow_rate,
        "co2_mol_pct": request.co2_mol_pct,
        "uncertainties": request.uncertainties or {},
    }
    result = run_monte_carlo(config, network, db, n_iterations=request.n_iterations)
    return MonteCarloResponse(**result)


@router.post("/uncertainty/tornado", response_model=TornadoResponse)
def run_tornado_analysis(
    request: TornadoRequest,
    db: Session = Depends(get_db),
) -> TornadoResponse:
    """Run tornado sensitivity analysis."""
    network = build_network(db)
    config = {
        "source_field_npdid": request.source_field_npdid,
        "gas_flow_rate": request.gas_flow_rate,
        "co2_mol_pct": request.co2_mol_pct,
    }
    result = run_tornado(config, network, db)
    return TornadoResponse(**result)


@router.get("/risk-register/{scenario_id}", response_model=list[Risk])
def get_risk_register(
    scenario_id: str,
    db: Session = Depends(get_db),
) -> list[Risk]:
    """Generate risk register for a scenario."""
    import json

    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Run optimization for the scenario
    network = build_network(db)
    opt_result = optimize_existing(
        source_field_npdid=scenario.source_field_npdid or 0,
        gas_flow_rate=scenario.gas_flow_rate_mscm_d or 10.0,
        co2_mol_pct=scenario.co2_mol_pct or 2.0,
        network=network,
        db=db,
    )

    # Generate risks
    risks = generate_risk_register(opt_result)
    return [Risk(**r) for r in risks]
