"""Facility model -- represents an NCS facility (platform, FPSO, subsea, onshore)."""

from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class Facility(Base):
    __tablename__ = "facilities"

    npdid_facility = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    kind = Column(String, nullable=True)
    phase = Column(String, nullable=True)
    functions = Column(String, nullable=True)
    belongs_to_name = Column(String, nullable=True, index=True)
    operator = Column(String, nullable=True)
    water_depth = Column(Float, nullable=True)
    startup_date = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
