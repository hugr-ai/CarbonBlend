"""StorageSite model -- CO2 storage sites (saline aquifers, depleted reservoirs)."""

from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class StorageSite(Base):
    __tablename__ = "storage_sites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, index=True)
    type = Column(String, nullable=True)
    capacity_mt = Column(Float, nullable=True)
    injection_rate_mtpa = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
