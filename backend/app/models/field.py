"""Field model -- represents an NCS producing field."""

from typing import Optional

from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class Field(Base):
    __tablename__ = "fields"

    npdid_field = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    main_area = Column(String, nullable=True)
    status = Column(String, nullable=True)
    hc_type = Column(String, nullable=True)
    operator = Column(String, nullable=True)
    discovery_year = Column(Integer, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
