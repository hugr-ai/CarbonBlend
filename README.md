# CarbonBlend

Interactive decision support tool for connecting high-CO2 gas fields into the Gassco/Gassled pipeline infrastructure on the Norwegian Continental Shelf.

## Overview

CarbonBlend helps early-phase concept engineers evaluate how to develop high-CO2 gas fields by:

- **Browsing** any NCS field or discovery from NPD FactPages data with CO2 content overlays
- **Visualizing** the full pipeline network from field to European export terminals (Easington, St Fergus, Emden, Dornum, Zeebrugge, Dunkerque)
- **Modeling** CO2 blending, removal, and transport through onshore processing hubs (Kollsnes, Karsto, Nyhamna)
- **Calculating** transport tariffs (K+U+I+O elements) per route across Business Arrangement Areas
- **Optimizing** pathways to minimize total development cost using existing infrastructure
- **Identifying** new infrastructure "bridges" (tie-backs, removal modules, blending tees) that improve economics
- **Analyzing** risk and uncertainty via Monte Carlo simulation, tornado charts, and auto-generated risk registers
- **Comparing** development concepts using MCDA-based decision support with Pugh matrices and radar charts
- **Exporting** DG1/DG2-ready reports with cost breakdowns, risk assessments, and recommendations

## Architecture

```
┌─────────────────────────────────────────────┐
│           Frontend (React + Vite)            │
│  MapLibre GL  │  React Flow  │  Recharts    │
│  Field Browser│  Network     │  Decision    │
│  Map View     │  Graph       │  Support     │
└──────────────────────┬──────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────┐
│           Backend (FastAPI)                   │
│  NPD Client  │  Optimizer   │  Uncertainty   │
│  CO2 Blending│  Bridge Find │  Risk Register │
│  Tariff Calc │  Network     │  MCDA/Decision │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────┴──────────────────────┐
│  Data Sources                                │
│  NPD FactPages CSV  │  Gassco UMM Feed      │
│  NPD FactMaps GeoJSON│ Curated CO2 + Tariffs│
│  SQLite Database     │  Market Prices        │
└─────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Backend Setup
```bash
cd backend
uv sync
uv run python -m scripts.ingest_npd    # Fetch NPD data + seed reference data
uv run python -m scripts.ingest_factmaps # Fetch GeoJSON geometries
uv run uvicorn app.main:app --reload    # Start API on :8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev    # Start dev server on :5173
```

Open http://localhost:5173 to use CarbonBlend.

## Data Sources

| Source | Data | Auth | Format |
|--------|------|------|--------|
| [NPD FactPages](https://factpages.sodir.no/) | Fields, discoveries, facilities, pipelines | None | CSV |
| [NPD FactMaps](https://factmaps.sodir.no/) | Geographic geometries | None | ArcGIS REST / GeoJSON |
| [Gassco UMM](https://umm.gassco.no/) | Capacity events, maintenance | None | Atom feed |
| Curated reference | CO2 mol% per field, tariffs, costs | N/A | JSON seed files |

## Key Features

### For Concept Engineers (DG0-DG2)
- Screen development concepts for high-CO2 gas fields
- Compare tie-back vs standalone vs blending options
- Evaluate routing to UK, Germany, Belgium, France markets
- Quantify the value of new infrastructure investments
- Generate risk registers and uncertainty analysis
- Produce MCDA-based concept comparisons for decision documents

## License

MIT
