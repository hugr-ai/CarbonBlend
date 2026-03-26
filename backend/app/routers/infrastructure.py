"""Infrastructure API endpoints: pipelines, facilities, processing plants, terminals, hubs."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.pipeline import Pipeline
from app.models.facility import Facility
from app.models.processing_plant import ProcessingPlant
from app.models.export_terminal import ExportTerminal

router = APIRouter(prefix="/api", tags=["infrastructure"])


# --- Pydantic schemas ---

class PipelineOut(BaseModel):
    npdid_pipeline: int
    name: str
    belongs_to: str | None = None
    operator: str | None = None
    phase: str | None = None
    from_facility: str | None = None
    to_facility: str | None = None
    from_facility_id: int | None = None
    to_facility_id: int | None = None
    diameter_inches: float | None = None
    medium: str | None = None
    main_grouping: str | None = None
    water_depth: float | None = None

    class Config:
        from_attributes = True


class FacilityOut(BaseModel):
    npdid_facility: int
    name: str
    kind: str | None = None
    phase: str | None = None
    functions: str | None = None
    belongs_to_name: str | None = None
    operator: str | None = None
    water_depth: float | None = None
    startup_date: str | None = None
    lat: float | None = None
    lon: float | None = None

    class Config:
        from_attributes = True


class ProcessingPlantOut(BaseModel):
    id: int
    name: str
    capacity_mscm_d: float | None = None
    ngl_capacity_mt_yr: float | None = None
    has_co2_removal: bool | None = None
    source_fields: str | None = None
    export_pipelines: str | None = None
    lat: float | None = None
    lon: float | None = None

    class Config:
        from_attributes = True


class ExportTerminalOut(BaseModel):
    id: int
    name: str
    country: str | None = None
    pipeline_feed: str | None = None
    capacity_bcm_yr: float | None = None
    co2_entry_spec_mol_pct: float | None = None
    hub_name: str | None = None
    default_price: float | None = None
    currency: str | None = None
    lat: float | None = None
    lon: float | None = None

    class Config:
        from_attributes = True


# --- Pipeline endpoints ---

@router.get("/pipelines", response_model=list[PipelineOut])
def list_pipelines(
    medium: str | None = Query(None, description="Filter by medium (Gas, Oil, etc.)"),
    phase: str | None = Query(None, description="Filter by phase"),
    main_grouping: str | None = Query(None, description="Filter by main grouping"),
    db: Session = Depends(get_db),
) -> list[PipelineOut]:
    """List pipelines with optional filters."""
    query = db.query(Pipeline)
    if medium:
        query = query.filter(Pipeline.medium.ilike(f"%{medium}%"))
    if phase:
        query = query.filter(Pipeline.phase.ilike(f"%{phase}%"))
    if main_grouping:
        query = query.filter(Pipeline.main_grouping.ilike(f"%{main_grouping}%"))
    return [PipelineOut.model_validate(p) for p in query.order_by(Pipeline.name).all()]


@router.get("/pipelines/{npdid}", response_model=PipelineOut)
def get_pipeline(npdid: int, db: Session = Depends(get_db)) -> PipelineOut:
    """Get a single pipeline by NPDID."""
    pipe = db.query(Pipeline).filter(Pipeline.npdid_pipeline == npdid).first()
    if not pipe:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return PipelineOut.model_validate(pipe)


# --- Facility endpoints ---

@router.get("/facilities", response_model=list[FacilityOut])
def list_facilities(
    kind: str | None = Query(None, description="Filter by kind (PLATFORM, FPSO, etc.)"),
    phase: str | None = Query(None, description="Filter by phase"),
    db: Session = Depends(get_db),
) -> list[FacilityOut]:
    """List facilities with optional filters."""
    query = db.query(Facility)
    if kind:
        query = query.filter(Facility.kind.ilike(f"%{kind}%"))
    if phase:
        query = query.filter(Facility.phase.ilike(f"%{phase}%"))
    return [FacilityOut.model_validate(f) for f in query.order_by(Facility.name).all()]


@router.get("/facilities/{npdid}", response_model=FacilityOut)
def get_facility(npdid: int, db: Session = Depends(get_db)) -> FacilityOut:
    """Get a single facility by NPDID."""
    fac = db.query(Facility).filter(Facility.npdid_facility == npdid).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Facility not found")
    return FacilityOut.model_validate(fac)


# --- Processing plants ---

@router.get("/processing-plants", response_model=list[ProcessingPlantOut])
def list_processing_plants(db: Session = Depends(get_db)) -> list[ProcessingPlantOut]:
    """List onshore gas processing plants."""
    plants = db.query(ProcessingPlant).order_by(ProcessingPlant.name).all()
    return [ProcessingPlantOut.model_validate(p) for p in plants]


# --- Export terminals ---

@router.get("/export-terminals", response_model=list[ExportTerminalOut])
def list_export_terminals(db: Session = Depends(get_db)) -> list[ExportTerminalOut]:
    """List European gas receiving terminals."""
    terminals = db.query(ExportTerminal).order_by(ExportTerminal.name).all()
    return [ExportTerminalOut.model_validate(t) for t in terminals]


# --- Hub platforms ---

@router.get("/hubs", response_model=list[FacilityOut])
def list_hubs(db: Session = Depends(get_db)) -> list[FacilityOut]:
    """List offshore hub platforms (facilities with hub/processing functions)."""
    hubs = (
        db.query(Facility)
        .filter(
            Facility.functions.ilike("%processing%")
            | Facility.functions.ilike("%hub%")
            | Facility.functions.ilike("%transport%")
        )
        .order_by(Facility.name)
        .all()
    )
    return [FacilityOut.model_validate(h) for h in hubs]
