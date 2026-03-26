"""Field API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.field import Field
from app.models.co2_spec import CO2Spec

router = APIRouter(prefix="/api/fields", tags=["fields"])


class CO2SpecOut(BaseModel):
    co2_mol_pct: float
    co2_mol_pct_range_low: float | None = None
    co2_mol_pct_range_high: float | None = None
    source: str | None = None
    notes: str | None = None

    class Config:
        from_attributes = True


class FieldOut(BaseModel):
    npdid_field: int
    name: str
    main_area: str | None = None
    status: str | None = None
    hc_type: str | None = None
    operator: str | None = None
    discovery_year: int | None = None
    lat: float | None = None
    lon: float | None = None
    co2_spec: CO2SpecOut | None = None

    class Config:
        from_attributes = True


class FieldListOut(BaseModel):
    npdid_field: int
    name: str
    main_area: str | None = None
    status: str | None = None
    hc_type: str | None = None
    operator: str | None = None
    discovery_year: int | None = None
    lat: float | None = None
    lon: float | None = None
    co2_mol_pct: float | None = None

    class Config:
        from_attributes = True


@router.get("", response_model=list[FieldListOut])
def list_fields(
    area: str | None = Query(None, description="Filter by main_area"),
    status: str | None = Query(None, description="Filter by status"),
    hc_type: str | None = Query(None, description="Filter by hydrocarbon type"),
    search: str | None = Query(None, description="Search by name"),
    has_co2_data: bool | None = Query(None, description="Only fields with CO2 data"),
    db: Session = Depends(get_db),
) -> list[FieldListOut]:
    """List fields with optional filters."""
    query = db.query(Field)

    if area:
        query = query.filter(Field.main_area.ilike(f"%{area}%"))
    if status:
        query = query.filter(Field.status.ilike(f"%{status}%"))
    if hc_type:
        query = query.filter(Field.hc_type.ilike(f"%{hc_type}%"))
    if search:
        query = query.filter(Field.name.ilike(f"%{search}%"))

    fields = query.order_by(Field.name).all()

    # Fetch CO2 specs
    co2_specs = {
        s.entity_name.upper(): s.co2_mol_pct
        for s in db.query(CO2Spec).filter(CO2Spec.entity_type == "field").all()
    }

    results = []
    for f in fields:
        co2_pct = co2_specs.get(f.name.upper() if f.name else "")
        if has_co2_data is True and co2_pct is None:
            continue
        if has_co2_data is False and co2_pct is not None:
            continue
        results.append(
            FieldListOut(
                npdid_field=f.npdid_field,
                name=f.name,
                main_area=f.main_area,
                status=f.status,
                hc_type=f.hc_type,
                operator=f.operator,
                discovery_year=f.discovery_year,
                lat=f.lat,
                lon=f.lon,
                co2_mol_pct=co2_pct,
            )
        )

    return results


@router.get("/{npdid}", response_model=FieldOut)
def get_field(npdid: int, db: Session = Depends(get_db)) -> FieldOut:
    """Get a single field by NPDID, including CO2 specification."""
    field = db.query(Field).filter(Field.npdid_field == npdid).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    co2_spec = (
        db.query(CO2Spec)
        .filter(
            CO2Spec.entity_type == "field",
            CO2Spec.entity_name == field.name,
        )
        .first()
    )

    spec_out = None
    if co2_spec:
        spec_out = CO2SpecOut(
            co2_mol_pct=co2_spec.co2_mol_pct,
            co2_mol_pct_range_low=co2_spec.co2_mol_pct_range_low,
            co2_mol_pct_range_high=co2_spec.co2_mol_pct_range_high,
            source=co2_spec.source,
            notes=co2_spec.notes,
        )

    return FieldOut(
        npdid_field=field.npdid_field,
        name=field.name,
        main_area=field.main_area,
        status=field.status,
        hc_type=field.hc_type,
        operator=field.operator,
        discovery_year=field.discovery_year,
        lat=field.lat,
        lon=field.lon,
        co2_spec=spec_out,
    )
