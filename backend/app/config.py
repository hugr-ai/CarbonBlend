"""Application configuration."""

from __future__ import annotations

from pathlib import Path
from pydantic import BaseModel


class Settings(BaseModel):
    """Application settings."""

    # Database
    db_path: str = "data/carbonblend.db"

    # NPD FactPages CSV endpoints
    npd_base_url: str = "https://factpages.npd.no/ReportServer_npdpublic"
    npd_field_csv: str = (
        "?/FactPages/tableview/field&rs:Command=Render&rc:Toolbar=false&rc:Format=CSV"
    )
    npd_facility_csv: str = (
        "?/FactPages/tableview/facility_fixed&rs:Command=Render&rc:Toolbar=false&rc:Format=CSV"
    )
    npd_pipeline_csv: str = (
        "?/FactPages/tableview/tuf_pipeline_overview&rs:Command=Render&rc:Toolbar=false&rc:Format=CSV"
    )
    npd_discovery_csv: str = (
        "?/FactPages/tableview/discovery&rs:Command=Render&rc:Toolbar=false&rc:Format=CSV"
    )

    # NPD FactMaps ArcGIS REST
    factmaps_base_url: str = (
        "https://factmaps.npd.no/arcgis/rest/services/FactMaps3/MapServer"
    )
    factmaps_pipelines_layer: int = 9
    factmaps_facilities_layer: int = 6
    factmaps_fields_layer: int = 1

    # UMM feed
    umm_feed_url: str = "https://umm.gassco.no/feed/atom"

    # Paths
    data_dir: Path = Path("data")
    geojson_dir: Path = Path("data/geojson")
    seed_dir: Path = Path(__file__).parent / "seed"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.db_path}"


settings = Settings()
