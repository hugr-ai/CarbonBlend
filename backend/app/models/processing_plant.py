"""ProcessingPlant model -- onshore gas processing plants."""

from sqlalchemy import Column, Integer, String, Float, Text

from app.database import Base


class ProcessingPlant(Base):
    __tablename__ = "processing_plants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, index=True)
    capacity_mscm_d = Column(Float, nullable=True)
    ngl_capacity_mt_yr = Column(Float, nullable=True)
    has_co2_removal = Column(Integer, nullable=True)  # SQLite: 0/1
    source_fields = Column(Text, nullable=True)  # JSON list
    export_pipelines = Column(Text, nullable=True)  # JSON list
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
