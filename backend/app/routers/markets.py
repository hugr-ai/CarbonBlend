"""Market data API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.market_pricing import get_market_prices

router = APIRouter(prefix="/api/markets", tags=["markets"])


class MarketOut(BaseModel):
    terminal: str
    country: str | None = None
    hub_name: str | None = None
    default_price: float | None = None
    currency: str | None = None
    co2_entry_spec_mol_pct: float | None = None
    pipeline_feed: str | None = None


@router.get("", response_model=list[MarketOut])
def list_markets(db: Session = Depends(get_db)) -> list[MarketOut]:
    """Get export terminal market prices."""
    prices = get_market_prices(db)
    return [MarketOut(**p) for p in prices]
