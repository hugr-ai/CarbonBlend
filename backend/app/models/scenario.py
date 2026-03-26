"""Scenario model -- user-created optimization scenarios."""

from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, Integer, Text

from app.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String, primary_key=True)  # UUID
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    source_field_npdid = Column(Integer, nullable=True)
    gas_flow_rate_mscm_d = Column(Float, nullable=True)
    co2_mol_pct = Column(Float, nullable=True)
    created_at = Column(
        String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at = Column(
        String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat()
    )
    config_json = Column(Text, nullable=True)
    result_json = Column(Text, nullable=True)
