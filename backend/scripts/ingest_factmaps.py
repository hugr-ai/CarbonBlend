"""Fetch GeoJSON from NPD FactMaps ArcGIS REST API, reproject, and save locally.

Fetches pipeline, facility, and field layers.
Handles pagination (1000 records per request).
Reprojects from ED50 UTM32 (EPSG:23032) to WGS84 (EPSG:4326) using pyproj.

Run with: python -m backend.scripts.ingest_factmaps
Or: cd backend && python -m scripts.ingest_factmaps
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

import httpx
from pyproj import Transformer

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# EPSG:23032 (ED50 / UTM zone 32N) -> EPSG:4326 (WGS84)
_transformer = Transformer.from_crs("EPSG:23032", "EPSG:4326", always_xy=True)

_TIMEOUT = httpx.Timeout(120.0, connect=30.0)
_PAGE_SIZE = 1000


def _fetch_layer(layer_id: int) -> list[dict[str, Any]]:
    """Fetch all features from a FactMaps ArcGIS REST layer with pagination."""
    base_url = f"{settings.factmaps_base_url}/{layer_id}/query"
    all_features: list[dict[str, Any]] = []
    offset = 0

    with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client:
        while True:
            params = {
                "where": "1=1",
                "outFields": "*",
                "f": "geojson",
                "resultRecordCount": _PAGE_SIZE,
                "resultOffset": offset,
            }
            logger.info(
                "Fetching layer %d, offset %d...", layer_id, offset
            )
            resp = client.get(base_url, params=params)
            resp.raise_for_status()
            data = resp.json()

            features = data.get("features", [])
            if not features:
                break

            all_features.extend(features)
            logger.info("  Got %d features (total: %d)", len(features), len(all_features))

            if len(features) < _PAGE_SIZE:
                break
            offset += _PAGE_SIZE

    return all_features


def _reproject_geometry(geometry: dict[str, Any]) -> dict[str, Any]:
    """Reproject a GeoJSON geometry from EPSG:23032 to EPSG:4326."""
    geom_type = geometry.get("type", "")
    coords = geometry.get("coordinates")

    if coords is None:
        return geometry

    def transform_point(pt: list[float]) -> list[float]:
        lon, lat = _transformer.transform(pt[0], pt[1])
        return [round(lon, 6), round(lat, 6)]

    def transform_ring(ring: list[list[float]]) -> list[list[float]]:
        return [transform_point(pt) for pt in ring]

    try:
        if geom_type == "Point":
            geometry["coordinates"] = transform_point(coords)
        elif geom_type == "MultiPoint":
            geometry["coordinates"] = [transform_point(pt) for pt in coords]
        elif geom_type == "LineString":
            geometry["coordinates"] = [transform_point(pt) for pt in coords]
        elif geom_type == "MultiLineString":
            geometry["coordinates"] = [
                [transform_point(pt) for pt in line] for line in coords
            ]
        elif geom_type == "Polygon":
            geometry["coordinates"] = [transform_ring(ring) for ring in coords]
        elif geom_type == "MultiPolygon":
            geometry["coordinates"] = [
                [transform_ring(ring) for ring in poly] for poly in coords
            ]
    except Exception as exc:
        logger.warning("Failed to reproject %s geometry: %s", geom_type, exc)

    return geometry


def _reproject_features(features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Reproject all features from EPSG:23032 to EPSG:4326."""
    reprojected = []
    for feature in features:
        geom = feature.get("geometry")
        if geom:
            feature["geometry"] = _reproject_geometry(geom)
        reprojected.append(feature)
    return reprojected


def _save_geojson(features: list[dict[str, Any]], filename: str) -> Path:
    """Save features as a GeoJSON FeatureCollection."""
    output_dir = Path(settings.geojson_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    with open(output_path, "w") as f:
        json.dump(geojson, f, indent=2)

    logger.info("Saved %d features to %s", len(features), output_path)
    return output_path


def main():
    """Fetch all FactMaps layers, reproject, and save."""
    logger.info("=== CarbonBlend FactMaps GeoJSON Ingestion ===")

    layers = [
        (settings.factmaps_pipelines_layer, "pipelines.geojson"),
        (settings.factmaps_facilities_layer, "facilities.geojson"),
        (settings.factmaps_fields_layer, "fields.geojson"),
    ]

    for layer_id, filename in layers:
        logger.info("--- Fetching layer %d -> %s ---", layer_id, filename)
        try:
            features = _fetch_layer(layer_id)
            if features:
                features = _reproject_features(features)
                _save_geojson(features, filename)
            else:
                logger.warning("No features returned for layer %d", layer_id)
        except Exception as exc:
            logger.error("Failed to fetch layer %d: %s", layer_id, exc)

    logger.info("=== FactMaps Ingestion Complete ===")


if __name__ == "__main__":
    main()
