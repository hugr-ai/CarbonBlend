"""Client for fetching data from NPD/Sodir FactMaps REST API.

The old ReportServer CSV endpoints (factpages.npd.no) no longer work.
We now use the ArcGIS REST API at factmaps.sodir.no to fetch fields,
facilities, pipelines, and discoveries as JSON features.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
import pandas as pd

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(60.0, connect=15.0)

# FactMaps WGS84 MapServer layer IDs
_BASE = "https://factmaps.sodir.no/api/rest/services/Factmaps/FactMapsWGS84/MapServer"
_LAYER_FIELDS = 502        # Field by status
_LAYER_FACILITIES = 307    # All facilities
_LAYER_PIPELINES = 311     # Pipelines
_LAYER_DISCOVERIES = 504   # Discovery, all - by main HC type


def _fetch_all_features(layer_id: int, out_fields: str = "*") -> list[dict[str, Any]]:
    """Fetch all features from a FactMaps layer, handling pagination."""
    all_features: list[dict[str, Any]] = []
    offset = 0
    batch_size = 1000

    with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client:
        while True:
            url = f"{_BASE}/{layer_id}/query"
            params = {
                "where": "1=1",
                "outFields": out_fields,
                "outSR": "4326",
                "f": "json",
                "resultRecordCount": str(batch_size),
                "resultOffset": str(offset),
            }
            logger.info("Fetching layer %d offset %d", layer_id, offset)
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            features = data.get("features", [])
            if not features:
                break

            all_features.extend(features)
            offset += len(features)

            # If we got fewer than batch_size, we've reached the end
            if len(features) < batch_size:
                break

    logger.info("Fetched %d total features from layer %d", len(all_features), layer_id)
    return all_features


def _features_to_dataframe(features: list[dict[str, Any]]) -> pd.DataFrame:
    """Convert ArcGIS JSON features to a pandas DataFrame."""
    rows = []
    for feat in features:
        row = dict(feat.get("attributes", {}))
        # Extract centroid from geometry if present
        geom = feat.get("geometry", {})
        if "x" in geom and "y" in geom:
            row["_lon"] = geom["x"]
            row["_lat"] = geom["y"]
        elif "rings" in geom and geom["rings"]:
            # Polygon - compute centroid from first ring
            ring = geom["rings"][0]
            if ring:
                row["_lon"] = sum(p[0] for p in ring) / len(ring)
                row["_lat"] = sum(p[1] for p in ring) / len(ring)
        elif "paths" in geom and geom["paths"]:
            # Polyline - midpoint
            path = geom["paths"][0]
            if path:
                mid = len(path) // 2
                row["_lon"] = path[mid][0]
                row["_lat"] = path[mid][1]
        rows.append(row)

    return pd.DataFrame(rows)


def fetch_fields_csv() -> pd.DataFrame:
    """Fetch field data from FactMaps REST API.

    Returns DataFrame with columns mapped to match expected NPD CSV names:
    fldNpdidField, fldName, fldMainArea, fldCurrentActivitySatus,
    fldHcType, cmpLongName, fldDiscoveryYear, fldNsDecDeg, fldEwDesDeg
    """
    features = _fetch_all_features(_LAYER_FIELDS)
    df = _features_to_dataframe(features)

    if df.empty:
        return df

    # Map FactMaps column names to expected CSV column names
    col_map = {}
    for col in df.columns:
        cl = col.lower()
        if "npdid" in cl and "field" in cl:
            col_map[col] = "fldNpdidField"
        elif cl in ("fldname", "name", "fieldname"):
            col_map[col] = "fldName"
        elif "mainarea" in cl:
            col_map[col] = "fldMainArea"
        elif "status" in cl or "activity" in cl:
            col_map[col] = "fldCurrentActivitySatus"
        elif "hctype" in cl or "hydrocarbon" in cl:
            col_map[col] = "fldHcType"
        elif "operator" in cl or "cmplongname" in cl:
            col_map[col] = "cmpLongName"
        elif "discoveryyear" in cl:
            col_map[col] = "fldDiscoveryYear"

    if "_lat" in df.columns:
        col_map["_lat"] = "fldNsDecDeg"
    if "_lon" in df.columns:
        col_map["_lon"] = "fldEwDesDeg"

    df = df.rename(columns=col_map)
    logger.info("Fields DataFrame columns: %s", list(df.columns))
    return df


def fetch_facilities_csv() -> pd.DataFrame:
    """Fetch facility data from FactMaps REST API."""
    features = _fetch_all_features(_LAYER_FACILITIES)
    df = _features_to_dataframe(features)

    if df.empty:
        return df

    col_map = {}
    for col in df.columns:
        cl = col.lower()
        if "npdid" in cl and "facil" in cl:
            col_map[col] = "fclNpdidFacility"
        elif cl in ("fclname", "name", "facilityname"):
            col_map[col] = "fclName"
        elif "kind" in cl:
            col_map[col] = "fclKind"
        elif "phase" in cl:
            col_map[col] = "fclPhase"
        elif "function" in cl:
            col_map[col] = "fclFunctions"
        elif "belongsto" in cl:
            col_map[col] = "fclBelongsToName"
        elif "operator" in cl or "cmplongname" in cl:
            col_map[col] = "cmpLongName"
        elif "waterdepth" in cl:
            col_map[col] = "fclWaterDepth"
        elif "startup" in cl:
            col_map[col] = "fclStartupDate"

    if "_lat" in df.columns:
        col_map["_lat"] = "fclNsDecDeg"
    if "_lon" in df.columns:
        col_map["_lon"] = "fclEwDesDeg"

    df = df.rename(columns=col_map)
    logger.info("Facilities DataFrame columns: %s", list(df.columns))
    return df


def fetch_pipelines_csv() -> pd.DataFrame:
    """Fetch pipeline data from FactMaps REST API."""
    features = _fetch_all_features(_LAYER_PIPELINES)
    df = _features_to_dataframe(features)

    if df.empty:
        return df

    col_map = {}
    for col in df.columns:
        cl = col.lower()
        if "npdid" in cl and ("pipe" in cl or "tuf" in cl):
            col_map[col] = "pipNpdidPipe"
        elif cl in ("pplname", "name", "pipname", "pipelinename"):
            col_map[col] = "pipName"
        elif "belongsto" in cl:
            col_map[col] = "pipBelongsTo"
        elif "operator" in cl or "cmplongname" in cl:
            col_map[col] = "cmpLongName"
        elif "phase" in cl or "currentphase" in cl:
            col_map[col] = "pipCurrentPhase"
        elif "fromfac" in cl or "namefrom" in cl:
            col_map[col] = "pipFromFacility"
        elif "tofac" in cl or "nameto" in cl:
            col_map[col] = "pipToFacility"
        elif "dimension" in cl or "diameter" in cl:
            col_map[col] = "pipDiameter"
        elif "medium" in cl:
            col_map[col] = "pipMedium"
        elif "maingrouping" in cl:
            col_map[col] = "pipMainGrouping"
        elif "waterdepth" in cl:
            col_map[col] = "pipWaterDepth"

    df = df.rename(columns=col_map)
    logger.info("Pipelines DataFrame columns: %s", list(df.columns))
    return df


def fetch_discoveries_csv() -> pd.DataFrame:
    """Fetch discovery data from FactMaps REST API."""
    features = _fetch_all_features(_LAYER_DISCOVERIES)
    df = _features_to_dataframe(features)

    if df.empty:
        return df

    col_map = {}
    for col in df.columns:
        cl = col.lower()
        if "npdid" in cl and "discov" in cl:
            col_map[col] = "dscNpdidDiscovery"
        elif cl in ("dscname", "name", "discoveryname"):
            col_map[col] = "dscName"
        elif "mainarea" in cl:
            col_map[col] = "dscMainArea"
        elif "status" in cl or "activity" in cl:
            col_map[col] = "dscCurrentActivityStatus"
        elif "hctype" in cl or "hydrocarbon" in cl:
            col_map[col] = "dscHcType"
        elif "operator" in cl or "cmplongname" in cl:
            col_map[col] = "cmpLongName"
        elif "discoveryyear" in cl:
            col_map[col] = "dscDiscoveryYear"
        elif "wellbore" in cl or "wlbname" in cl:
            col_map[col] = "dscWlbName"

    if "_lat" in df.columns:
        col_map["_lat"] = "dscNsDecDeg"
    if "_lon" in df.columns:
        col_map["_lon"] = "dscEwDesDeg"

    df = df.rename(columns=col_map)
    logger.info("Discoveries DataFrame columns: %s", list(df.columns))
    return df
