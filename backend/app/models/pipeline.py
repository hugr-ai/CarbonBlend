"""Pipeline model -- represents an NCS pipeline segment."""

from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class Pipeline(Base):
    __tablename__ = "pipelines"

    npdid_pipeline = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    belongs_to = Column(String, nullable=True)
    operator = Column(String, nullable=True)
    phase = Column(String, nullable=True)
    from_facility = Column(String, nullable=True)
    to_facility = Column(String, nullable=True)
    from_facility_id = Column(Integer, nullable=True)
    to_facility_id = Column(Integer, nullable=True)
    diameter_inches = Column(Float, nullable=True)
    medium = Column(String, nullable=True)
    main_grouping = Column(String, nullable=True)
    water_depth = Column(Float, nullable=True)
