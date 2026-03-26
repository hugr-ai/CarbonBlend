"""Tariff model -- Gassled pipeline tariff elements."""

from sqlalchemy import Column, Integer, String, Float

from app.database import Base


class Tariff(Base):
    __tablename__ = "tariffs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pipeline_segment = Column(String, nullable=False, index=True)
    baa = Column(String, nullable=True)  # Booking Area Access
    k_element = Column(Float, nullable=True)  # Capital element NOK/Sm3
    u_element = Column(Float, nullable=True)  # Upgrade element
    i_element = Column(Float, nullable=True)  # Investment element
    o_element = Column(Float, nullable=True)  # Operating element
    unit_tariff_nok_sm3 = Column(Float, nullable=True)  # K+U+I+O
    year = Column(Integer, nullable=True)
