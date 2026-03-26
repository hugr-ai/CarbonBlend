"""Decision support API endpoints."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any

from app.services.decision_support import (
    compare_scenarios,
    dominance_analysis,
    weight_sensitivity,
    value_of_information,
)

router = APIRouter(prefix="/api/decision", tags=["decision"])


# --- Schemas ---

class ScenarioInput(BaseModel):
    name: str
    total_cost_mnok: float = 0.0
    co2_removal_cost_mnok: float = 0.0
    tariff_cost_mnok: float = 0.0
    num_feasible_paths: int = 0
    feasibility_pct: float = 100.0
    p50_cost_mnok: float = 0.0


class CompareRequest(BaseModel):
    scenarios: list[ScenarioInput]
    weights: dict[str, float]


class RankEntry(BaseModel):
    rank: int
    name: str
    score: float


class CompareResponse(BaseModel):
    status: str
    criteria: list[str]
    weights: dict[str, float]
    raw_matrix: dict[str, dict[str, float]]
    normalized_matrix: dict[str, dict[str, float]]
    weighted_scores: dict[str, dict[str, float]]
    total_scores: dict[str, float]
    ranking: list[RankEntry]


class SensitivityRequest(BaseModel):
    scenarios: list[ScenarioInput]
    weight_ranges: dict[str, list[float]]  # [min, max] pairs
    n_samples: int = 100


class VOIParam(BaseModel):
    std: float
    impact_per_unit: float


class VOIRequest(BaseModel):
    name: str = "scenario"
    total_cost_mnok: float
    uncertain_params: dict[str, VOIParam]


class DominanceRequest(BaseModel):
    scenarios: list[ScenarioInput]


class DominanceResponse(BaseModel):
    status: str
    criteria: list[str]
    pareto_optimal: list[str]
    dominated: list[str]
    num_pareto: int
    num_total: int


# --- Endpoints ---

@router.post("/compare", response_model=CompareResponse)
def compare(request: CompareRequest) -> CompareResponse:
    """Multi-criteria decision analysis comparing scenarios."""
    scenarios = [s.model_dump() for s in request.scenarios]
    result = compare_scenarios(scenarios, request.weights)
    return CompareResponse(**result)


@router.post("/sensitivity", response_model=dict[str, Any])
def sensitivity(request: SensitivityRequest) -> dict[str, Any]:
    """Weight sensitivity analysis."""
    scenarios = [s.model_dump() for s in request.scenarios]
    weight_ranges = {k: tuple(v) for k, v in request.weight_ranges.items()}
    return weight_sensitivity(scenarios, weight_ranges, n_samples=request.n_samples)


@router.post("/voi", response_model=dict[str, Any])
def voi(request: VOIRequest) -> dict[str, Any]:
    """Value of information analysis."""
    scenario = {"name": request.name, "total_cost_mnok": request.total_cost_mnok}
    params = {k: v.model_dump() for k, v in request.uncertain_params.items()}
    return value_of_information(scenario, params)


@router.post("/dominance", response_model=DominanceResponse)
def dominance(request: DominanceRequest) -> DominanceResponse:
    """Pareto dominance analysis."""
    scenarios = [s.model_dump() for s in request.scenarios]
    result = dominance_analysis(scenarios)
    return DominanceResponse(**result)
