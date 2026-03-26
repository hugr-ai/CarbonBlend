"""ExportTerminal model -- European gas receiving terminals."""

from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class ExportTerminal(Base):
    __tablename__ = "export_terminals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, index=True)
    country = Column(String, nullable=True)
    pipeline_feed = Column(String, nullable=True)
    capacity_bcm_yr = Column(Float, nullable=True)
    co2_entry_spec_mol_pct = Column(Float, nullable=True)
    hub_name = Column(String, nullable=True)
    default_price = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
