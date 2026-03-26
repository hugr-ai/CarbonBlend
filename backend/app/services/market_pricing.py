"""Market pricing and revenue calculations for gas export terminals."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.export_terminal import ExportTerminal


def get_market_prices(db: Session) -> list[dict[str, Any]]:
    """Return all terminal market prices from the database.

    Returns:
        List of dicts with terminal name, hub, price, currency, country.
    """
    terminals = db.query(ExportTerminal).all()
    return [
        {
            "terminal": t.name,
            "country": t.country,
            "hub_name": t.hub_name,
            "default_price": t.default_price,
            "currency": t.currency,
            "co2_entry_spec_mol_pct": t.co2_entry_spec_mol_pct,
            "pipeline_feed": t.pipeline_feed,
        }
        for t in terminals
    ]


def calculate_delivered_cost(
    route_tariff_nok_sm3: float,
    processing_cost_nok_sm3: float,
    co2_removal_cost_nok_sm3: float,
) -> float:
    """Calculate the total delivered cost of gas to a terminal.

    All costs in NOK/Sm3.

    Args:
        route_tariff_nok_sm3: Total pipeline tariff along route.
        processing_cost_nok_sm3: Onshore processing cost.
        co2_removal_cost_nok_sm3: CO2 removal cost (if needed).

    Returns:
        Total delivered cost in NOK/Sm3.
    """
    return round(
        route_tariff_nok_sm3 + processing_cost_nok_sm3 + co2_removal_cost_nok_sm3, 6
    )


def calculate_net_revenue(
    market_price_nok_sm3: float, delivered_cost_nok_sm3: float
) -> float:
    """Calculate net revenue (market price minus delivered cost).

    Args:
        market_price_nok_sm3: Gas price at terminal in NOK/Sm3.
        delivered_cost_nok_sm3: Total delivered cost in NOK/Sm3.

    Returns:
        Net revenue in NOK/Sm3. Negative means the route is uneconomic.
    """
    return round(market_price_nok_sm3 - delivered_cost_nok_sm3, 6)
