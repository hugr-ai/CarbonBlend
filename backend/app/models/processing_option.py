"""ProcessingOption model -- CO2 removal technologies."""

from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class ProcessingOption(Base):
    __tablename__ = "processing_options"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, index=True)
    capex_per_mtpa = Column(Float, nullable=True)  # MUSD per Mtpa
    opex_per_tonne = Column(Float, nullable=True)  # USD per tonne
    removal_efficiency = Column(Float, nullable=True)  # 0-1
    energy_penalty_pct = Column(Float, nullable=True)  # %
    maturity = Column(String, nullable=True)  # TRL description
