"""CO2Spec model -- CO2 concentration data per field/discovery."""

from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class CO2Spec(Base):
    __tablename__ = "co2_specs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String, nullable=False)  # "field" or "discovery"
    entity_name = Column(String, nullable=False, index=True)
    entity_npdid = Column(Integer, nullable=True, index=True)
    co2_mol_pct = Column(Float, nullable=False)
    co2_mol_pct_range_low = Column(Float, nullable=True)
    co2_mol_pct_range_high = Column(Float, nullable=True)
    source = Column(String, nullable=True)
    notes = Column(String, nullable=True)
