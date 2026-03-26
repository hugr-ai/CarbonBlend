"""CO2 blending, storage, and processing API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.models.storage_site import StorageSite
from app.models.processing_option import ProcessingOption
from app.services.co2_blending import calculate_blend, required_removal, blending_ratio_for_target

router = APIRouter(prefix="/api/co2", tags=["co2"])


# --- Schemas ---

class StreamInput(BaseModel):
    name: str
    flow_rate: float
    co2_mol_pct: float


class BlendRequest(BaseModel):
    streams: list[StreamInput]


class BlendContribution(BaseModel):
    name: str
    flow_rate: float
    co2_mol_pct: float
    flow_fraction: float
    co2_contribution_mol_pct: float


class BlendResponse(BaseModel):
    blended_co2_mol_pct: float
    total_flow: float
    meets_target: bool
    target_co2_mol_pct: float
    contributions: list[BlendContribution]


class StorageSiteOut(BaseModel):
    id: int
    name: str
    type: str | None = None
    capacity_mt: float | None = None
    injection_rate_mtpa: float | None = None
    status: str | None = None
    lat: float | None = None
    lon: float | None = None

    class Config:
        from_attributes = True


class ProcessingOptionOut(BaseModel):
    id: int
    name: str
    capex_per_mtpa: float | None = None
    opex_per_tonne: float | None = None
    removal_efficiency: float | None = None
    energy_penalty_pct: float | None = None
    maturity: str | None = None

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.post("/blend", response_model=BlendResponse)
def blend_streams(request: BlendRequest) -> BlendResponse:
    """Calculate CO2 concentration from blending multiple gas streams."""
    streams = [s.model_dump() for s in request.streams]
    result = calculate_blend(streams)
    return BlendResponse(**result)


@router.get("/storage-sites", response_model=list[StorageSiteOut])
def list_storage_sites(db: Session = Depends(get_db)) -> list[StorageSiteOut]:
    """List CO2 storage sites."""
    sites = db.query(StorageSite).order_by(StorageSite.name).all()
    return [StorageSiteOut.model_validate(s) for s in sites]


@router.get("/processing-options", response_model=list[ProcessingOptionOut])
def list_processing_options(db: Session = Depends(get_db)) -> list[ProcessingOptionOut]:
    """List CO2 removal technology options."""
    options = db.query(ProcessingOption).order_by(ProcessingOption.name).all()
    return [ProcessingOptionOut.model_validate(o) for o in options]
