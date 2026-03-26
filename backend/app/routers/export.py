"""Report export API endpoints (Excel)."""

from __future__ import annotations

import io
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.scenario import Scenario
from app.services.report_builder import build_excel_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/report/{scenario_id}")
def export_report(
    scenario_id: str,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Generate and download an Excel report for a scenario."""
    scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Parse JSON fields
    config: dict[str, Any] = {}
    if scenario.config_json:
        try:
            config = json.loads(scenario.config_json)
        except (json.JSONDecodeError, TypeError):
            pass

    result: dict[str, Any] = {}
    if scenario.result_json:
        try:
            result = json.loads(scenario.result_json)
        except (json.JSONDecodeError, TypeError):
            pass

    scenario_data = {
        "id": scenario.id,
        "name": scenario.name,
        "description": scenario.description,
        "source_field_npdid": scenario.source_field_npdid,
        "gas_flow_rate_mscm_d": scenario.gas_flow_rate_mscm_d,
        "co2_mol_pct": scenario.co2_mol_pct,
        "config": config,
        "result": result,
        "created_at": scenario.created_at,
    }

    workbook_bytes = build_excel_report(scenario_data, db)

    safe_name = (scenario.name or "report").replace(" ", "_")[:30]
    filename = f"carbonblend-{safe_name}-{scenario_id[:8]}.xlsx"

    return StreamingResponse(
        io.BytesIO(workbook_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
