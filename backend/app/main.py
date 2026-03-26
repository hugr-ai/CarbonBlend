"""CarbonBlend FastAPI application."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.routers import (
    fields,
    infrastructure,
    network,
    co2,
    tariffs,
    markets,
    umm,
    scenarios,
    optimization,
    uncertainty_router,
    decision,
    export,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    # Import all models so Base.metadata knows about them
    import app.models  # noqa: F401

    logger.info("Creating database tables...")
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    logger.info("Database ready at %s", settings.db_path)
    yield


app = FastAPI(
    title="CarbonBlend API",
    description=(
        "API for exploring how to connect high-CO2 gas fields into the "
        "Gassco/Gassled pipeline infrastructure on the Norwegian Continental Shelf."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(fields.router)
app.include_router(infrastructure.router)
app.include_router(network.router)
app.include_router(co2.router)
app.include_router(tariffs.router)
app.include_router(markets.router)
app.include_router(umm.router)
app.include_router(scenarios.router)
app.include_router(optimization.router)
app.include_router(uncertainty_router.router)
app.include_router(decision.router)
app.include_router(export.router)

# Serve static GeoJSON files
geojson_path = Path(settings.geojson_dir)
if geojson_path.exists():
    app.mount(
        "/data/geojson",
        StaticFiles(directory=str(geojson_path)),
        name="geojson",
    )


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "app": "CarbonBlend", "version": "0.1.0"}
