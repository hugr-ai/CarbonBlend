"""Build a NetworkX graph of the NCS gas infrastructure.

Provides three network views:
- build_key_network(): Curated view of key infrastructure (fields with CO2 data,
  major hubs, processing plants, terminals)
- build_network(): Full network (all connected nodes)
- get_subgraph(): Field-centred subgraph with path-to-terminal annotations
"""

from __future__ import annotations

import json
import logging
from typing import Any

import networkx as nx
from sqlalchemy.orm import Session

from app.models.co2_spec import CO2Spec
from app.models.facility import Facility
from app.models.field import Field
from app.models.pipeline import Pipeline
from app.models.processing_plant import ProcessingPlant
from app.models.export_terminal import ExportTerminal
from app.models.tariff import Tariff

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Major hub platform names to include in key network
# ---------------------------------------------------------------------------
MAJOR_HUB_NAMES = [
    "DRAUPNER",
    "SLEIPNER",
    "HEIMDAL",
    "TROLL A",
    "TROLL B",
    "TROLL C",
    "EKOFISK",
    "ASGARD B",
    "ASGARD A",
    "KVITEBJORN",
    "OSEBERG",
    "GULLFAKS",
    "STATFJORD",
    "SNORRE",
    "KRISTIN",
    "HEIDRUN",
    "NORNE",
    "ORMEN LANGE",
    "NYHAMNA",
    "VISUND",
    "GJOA",
    "MARTIN LINGE",
    "JOHAN SVERDRUP",
]


def _is_major_hub(name: str) -> bool:
    """Check if a facility name matches a major hub."""
    name_upper = (name or "").upper()
    return any(hub in name_upper for hub in MAJOR_HUB_NAMES)


# ---------------------------------------------------------------------------
# Geographic projection helpers
# ---------------------------------------------------------------------------

def _geo_to_screen(
    nodes_with_coords: list[tuple[str, float, float]],
    canvas_width: int = 1400,
    canvas_height: int = 900,
    padding: int = 60,
) -> dict[str, dict[str, float]]:
    """Convert lat/lon pairs to screen (x, y) positions.

    Uses simple equirectangular projection:
      x = (lon - min_lon) / (max_lon - min_lon) * usable_width + padding
      y = (1 - (lat - min_lat) / (max_lat - min_lat)) * usable_height + padding

    Returns a dict of node_id -> {"x": ..., "y": ...}.
    """
    if not nodes_with_coords:
        return {}

    lons = [lon for _, _, lon in nodes_with_coords]
    lats = [lat for _, lat, _ in nodes_with_coords]

    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)

    lon_range = max_lon - min_lon if max_lon != min_lon else 1.0
    lat_range = max_lat - min_lat if max_lat != min_lat else 1.0

    usable_w = canvas_width - 2 * padding
    usable_h = canvas_height - 2 * padding

    positions: dict[str, dict[str, float]] = {}
    for node_id, lat, lon in nodes_with_coords:
        x = ((lon - min_lon) / lon_range) * usable_w + padding
        y = (1.0 - (lat - min_lat) / lat_range) * usable_h + padding
        positions[node_id] = {"x": round(x, 1), "y": round(y, 1)}

    return positions


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _load_co2_specs(db: Session) -> dict[str, CO2Spec]:
    """Load CO2 specs for fields, keyed by upper-case entity_name."""
    specs = db.query(CO2Spec).filter(CO2Spec.entity_type == "field").all()
    return {s.entity_name.upper(): s for s in specs}


def _load_facilities(db: Session) -> tuple[list[Facility], dict[str, Facility], dict[int, Facility]]:
    """Load all facilities, returning list, name-lookup, and id-lookup."""
    facilities = db.query(Facility).all()
    by_name: dict[str, Facility] = {}
    by_id: dict[int, Facility] = {}
    for fac in facilities:
        by_name[fac.name] = fac
        by_id[fac.npdid_facility] = fac
    return facilities, by_name, by_id


def _resolve_pipeline_endpoints(
    pipe: Pipeline,
    facility_by_name: dict[str, Facility],
) -> tuple[str | None, str | None]:
    """Resolve from/to node IDs for a pipeline."""
    from_id = f"facility_{pipe.from_facility_id}" if pipe.from_facility_id else None
    to_id = f"facility_{pipe.to_facility_id}" if pipe.to_facility_id else None

    if from_id is None and pipe.from_facility:
        matched = facility_by_name.get(pipe.from_facility)
        if matched:
            from_id = f"facility_{matched.npdid_facility}"
    if to_id is None and pipe.to_facility:
        matched = facility_by_name.get(pipe.to_facility)
        if matched:
            to_id = f"facility_{matched.npdid_facility}"

    return from_id, to_id


def _add_field_node(
    G: nx.DiGraph,
    field: Field,
    co2_specs: dict[str, CO2Spec],
    *,
    is_secondary: bool = False,
) -> str:
    """Add a field node to the graph, enriched with CO2 data."""
    node_id = f"field_{field.npdid_field}"
    spec = co2_specs.get((field.name or "").upper())
    G.add_node(
        node_id,
        label=field.name,
        node_type="field",
        main_area=field.main_area,
        status=field.status,
        hc_type=field.hc_type,
        operator=field.operator,
        npdid=field.npdid_field,
        lat=field.lat,
        lon=field.lon,
        co2_mol_pct=spec.co2_mol_pct if spec else None,
        co2_source=spec.source if spec else None,
        has_co2_data=spec is not None,
        is_secondary=is_secondary,
    )
    return node_id


def _add_facility_node(G: nx.DiGraph, fac: Facility, *, is_hub: bool = False) -> str:
    """Add a facility node to the graph."""
    node_id = f"facility_{fac.npdid_facility}"
    G.add_node(
        node_id,
        label=fac.name,
        node_type="facility",
        kind=fac.kind,
        phase=fac.phase,
        operator=fac.operator,
        npdid=fac.npdid_facility,
        lat=fac.lat,
        lon=fac.lon,
        is_hub=is_hub,
    )
    return node_id


def _add_plant_node(G: nx.DiGraph, plant: ProcessingPlant) -> str:
    """Add a processing plant node to the graph."""
    node_id = f"plant_{plant.id}"
    source_fields: list[str] = []
    if plant.source_fields:
        try:
            source_fields = json.loads(plant.source_fields)
        except (json.JSONDecodeError, TypeError):
            pass

    G.add_node(
        node_id,
        label=plant.name,
        node_type="processing_plant",
        capacity_mscm_d=plant.capacity_mscm_d,
        has_co2_removal=bool(plant.has_co2_removal),
        source_fields=source_fields,
        lat=plant.lat,
        lon=plant.lon,
    )
    return node_id


def _add_terminal_node(G: nx.DiGraph, term: ExportTerminal) -> str:
    """Add an export terminal node to the graph."""
    node_id = f"terminal_{term.id}"
    G.add_node(
        node_id,
        label=term.name,
        node_type="export_terminal",
        country=term.country,
        hub_name=term.hub_name,
        default_price=term.default_price,
        currency=term.currency,
        co2_entry_spec_mol_pct=term.co2_entry_spec_mol_pct,
        lat=term.lat,
        lon=term.lon,
    )
    return node_id


def _add_pipeline_edge(
    G: nx.DiGraph,
    pipe: Pipeline,
    from_id: str,
    to_id: str,
    db: Session,
) -> None:
    """Add a pipeline edge with tariff lookup."""
    tariff_val = None
    if pipe.main_grouping:
        tariff = (
            db.query(Tariff)
            .filter(Tariff.pipeline_segment.ilike(f"%{pipe.main_grouping}%"))
            .first()
        )
        if tariff:
            tariff_val = tariff.unit_tariff_nok_sm3

    G.add_edge(
        from_id,
        to_id,
        edge_type="pipeline",
        label=pipe.name,
        npdid=pipe.npdid_pipeline,
        diameter_inches=pipe.diameter_inches,
        medium=pipe.medium,
        main_grouping=pipe.main_grouping,
        co2_limit=2.5,  # Default Gassled spec
        tariff_nok_sm3=tariff_val,
    )


# ---------------------------------------------------------------------------
# build_key_network -- curated "key infrastructure" view
# ---------------------------------------------------------------------------

def build_key_network(db: Session) -> nx.DiGraph:
    """Build a focused network of key NCS gas infrastructure.

    Includes:
    - Fields that have CO2 reference data
    - Major hub facilities (Draupner, Sleipner, etc.)
    - All processing plants
    - All export terminals
    - Pipelines connecting these key nodes
    - Secondary fields on pipeline routes between key nodes
    """
    G = nx.DiGraph()
    co2_specs = _load_co2_specs(db)
    facilities, facility_by_name, facility_by_id = _load_facilities(db)

    # Track which facility IDs are "key"
    key_facility_ids: set[int] = set()

    # --- 1. Add major hub facilities ---
    for fac in facilities:
        if _is_major_hub(fac.name):
            _add_facility_node(G, fac, is_hub=True)
            key_facility_ids.add(fac.npdid_facility)

    # --- 2. Add fields with CO2 data ---
    fields = db.query(Field).all()
    field_by_name: dict[str, Field] = {f.name.upper(): f for f in fields if f.name}
    co2_field_names: set[str] = set()

    for field in fields:
        name_upper = (field.name or "").upper()
        if name_upper in co2_specs:
            _add_field_node(G, field, co2_specs)
            co2_field_names.add(name_upper)
            # Also add facilities that belong to this field
            for fac in facilities:
                if (
                    fac.belongs_to_name
                    and fac.belongs_to_name.upper() == name_upper
                ):
                    if fac.npdid_facility not in key_facility_ids:
                        _add_facility_node(G, fac, is_hub=False)
                        key_facility_ids.add(fac.npdid_facility)
                    G.add_edge(
                        f"field_{field.npdid_field}",
                        f"facility_{fac.npdid_facility}",
                        edge_type="field_to_facility",
                        label=f"{field.name} -> {fac.name}",
                    )

    # --- 3. Add processing plants ---
    plants = db.query(ProcessingPlant).all()
    for plant in plants:
        _add_plant_node(G, plant)
        # Connect plant to matching facilities
        for fac in facilities:
            if fac.name and plant.name and plant.name.upper() in fac.name.upper():
                if fac.npdid_facility not in key_facility_ids:
                    _add_facility_node(G, fac, is_hub=False)
                    key_facility_ids.add(fac.npdid_facility)
                G.add_edge(
                    f"facility_{fac.npdid_facility}",
                    f"plant_{plant.id}",
                    edge_type="facility_to_plant",
                    label=f"{fac.name} -> {plant.name}",
                )

    # --- 4. Add export terminals ---
    terminals = db.query(ExportTerminal).all()
    for term in terminals:
        _add_terminal_node(G, term)

    # --- 5. Add pipelines connecting key nodes ---
    pipelines = db.query(Pipeline).all()
    for pipe in pipelines:
        from_id, to_id = _resolve_pipeline_endpoints(pipe, facility_by_name)
        if not from_id or not to_id:
            continue

        from_in = G.has_node(from_id)
        to_in = G.has_node(to_id)

        if from_in and to_in:
            _add_pipeline_edge(G, pipe, from_id, to_id, db)
        elif from_in or to_in:
            # One end is in the key network -- add the other end as secondary
            # but only if it's a real facility with a position
            if not from_in and pipe.from_facility_id:
                fac = facility_by_id.get(pipe.from_facility_id)
                if fac:
                    _add_facility_node(G, fac, is_hub=False)
                    key_facility_ids.add(fac.npdid_facility)
                    _add_pipeline_edge(G, pipe, from_id, to_id, db)
            elif not to_in and pipe.to_facility_id:
                fac = facility_by_id.get(pipe.to_facility_id)
                if fac:
                    _add_facility_node(G, fac, is_hub=False)
                    key_facility_ids.add(fac.npdid_facility)
                    _add_pipeline_edge(G, pipe, from_id, to_id, db)

    # --- 6. Connect fields to hub facilities that belong to them ---
    # (for fields with CO2 data whose primary facility is a hub)
    for fac in facilities:
        if fac.npdid_facility in key_facility_ids and fac.belongs_to_name:
            field_name_upper = fac.belongs_to_name.upper()
            field = field_by_name.get(field_name_upper)
            if field:
                field_node = f"field_{field.npdid_field}"
                fac_node = f"facility_{fac.npdid_facility}"
                if G.has_node(field_node) and G.has_node(fac_node):
                    if not G.has_edge(field_node, fac_node):
                        G.add_edge(
                            field_node,
                            fac_node,
                            edge_type="field_to_facility",
                            label=f"{field.name} -> {fac.name}",
                        )

    logger.info(
        "Built key network with %d nodes and %d edges",
        G.number_of_nodes(),
        G.number_of_edges(),
    )
    return G


# ---------------------------------------------------------------------------
# build_network -- full network (optimised: only connected nodes)
# ---------------------------------------------------------------------------

def build_network(db: Session) -> nx.DiGraph:
    """Build the full NCS gas transport infrastructure graph.

    Optimised: only includes facilities that have at least one pipeline
    connection or belong to a field.
    """
    G = nx.DiGraph()
    co2_specs = _load_co2_specs(db)
    facilities, facility_by_name, facility_by_id = _load_facilities(db)

    # Determine which facilities are connected via pipelines
    pipelines = db.query(Pipeline).all()
    connected_facility_ids: set[int] = set()
    for pipe in pipelines:
        if pipe.from_facility_id:
            connected_facility_ids.add(pipe.from_facility_id)
        if pipe.to_facility_id:
            connected_facility_ids.add(pipe.to_facility_id)
        # Also resolve by name
        if pipe.from_facility and pipe.from_facility in facility_by_name:
            connected_facility_ids.add(facility_by_name[pipe.from_facility].npdid_facility)
        if pipe.to_facility and pipe.to_facility in facility_by_name:
            connected_facility_ids.add(facility_by_name[pipe.to_facility].npdid_facility)

    # Facilities that belong to a field
    fields = db.query(Field).all()
    field_names_upper = {f.name.upper() for f in fields if f.name}
    for fac in facilities:
        if fac.belongs_to_name and fac.belongs_to_name.upper() in field_names_upper:
            connected_facility_ids.add(fac.npdid_facility)

    # --- Add connected facility nodes ---
    for fac in facilities:
        if fac.npdid_facility in connected_facility_ids:
            _add_facility_node(G, fac, is_hub=_is_major_hub(fac.name))

    # --- Add field nodes ---
    for field in fields:
        _add_field_node(G, field, co2_specs)
        for fac in facilities:
            if (
                fac.belongs_to_name
                and fac.belongs_to_name.upper() == (field.name or "").upper()
                and fac.npdid_facility in connected_facility_ids
            ):
                G.add_edge(
                    f"field_{field.npdid_field}",
                    f"facility_{fac.npdid_facility}",
                    edge_type="field_to_facility",
                    label=f"{field.name} -> {fac.name}",
                )

    # --- Add pipeline edges ---
    for pipe in pipelines:
        from_id, to_id = _resolve_pipeline_endpoints(pipe, facility_by_name)
        if from_id and to_id and G.has_node(from_id) and G.has_node(to_id):
            _add_pipeline_edge(G, pipe, from_id, to_id, db)

    # --- Add processing plants ---
    plants = db.query(ProcessingPlant).all()
    for plant in plants:
        _add_plant_node(G, plant)
        for fac in facilities:
            if fac.name and plant.name and plant.name.upper() in fac.name.upper():
                if G.has_node(f"facility_{fac.npdid_facility}"):
                    G.add_edge(
                        f"facility_{fac.npdid_facility}",
                        f"plant_{plant.id}",
                        edge_type="facility_to_plant",
                        label=f"{fac.name} -> {plant.name}",
                    )

    # --- Add export terminals ---
    terminals = db.query(ExportTerminal).all()
    for term in terminals:
        _add_terminal_node(G, term)

    logger.info(
        "Built full network with %d nodes and %d edges",
        G.number_of_nodes(),
        G.number_of_edges(),
    )
    return G


# ---------------------------------------------------------------------------
# get_subgraph -- field-centred subgraph with path-to-terminal annotation
# ---------------------------------------------------------------------------

def get_subgraph(
    graph: nx.DiGraph, field_npdid: int, depth: int = 5
) -> nx.DiGraph:
    """Extract a subgraph via BFS from a field node.

    Enriches nodes on viable export paths with `path_to_terminal = True`.

    Args:
        graph: Full infrastructure graph.
        field_npdid: NPDID of the source field.
        depth: Maximum BFS depth (default 5).

    Returns:
        Subgraph containing all nodes within `depth` hops of the field,
        always including reachable processing plants and terminals.
    """
    source_node = f"field_{field_npdid}"
    if source_node not in graph:
        return nx.DiGraph()

    # BFS forward (downstream)
    forward_nodes = set(
        nx.single_source_shortest_path_length(graph, source_node, cutoff=depth).keys()
    )
    # BFS backward (upstream) on reversed graph
    backward_nodes = set(
        nx.single_source_shortest_path_length(
            graph.reverse(), source_node, cutoff=depth
        ).keys()
    )

    all_nodes = forward_nodes | backward_nodes

    # Always include reachable processing plants and terminals even beyond depth
    # by following forward paths further
    extended_forward = set(
        nx.single_source_shortest_path_length(graph, source_node, cutoff=depth + 3).keys()
    )
    for node_id in extended_forward:
        ndata = graph.nodes.get(node_id, {})
        if ndata.get("node_type") in ("processing_plant", "export_terminal"):
            # Include this node and the shortest path to it
            try:
                path = nx.shortest_path(graph, source_node, node_id)
                all_nodes.update(path)
            except nx.NetworkXNoPath:
                pass

    sub = graph.subgraph(all_nodes).copy()

    # --- Annotate nodes on viable export paths ---
    terminal_nodes = [
        n for n, d in sub.nodes(data=True)
        if d.get("node_type") in ("export_terminal", "processing_plant")
    ]
    nodes_on_path: set[str] = set()
    for terminal in terminal_nodes:
        try:
            path = nx.shortest_path(sub, source_node, terminal)
            nodes_on_path.update(path)
        except nx.NetworkXNoPath:
            pass

    for node_id in sub.nodes:
        sub.nodes[node_id]["path_to_terminal"] = node_id in nodes_on_path

    return sub


# ---------------------------------------------------------------------------
# get_react_flow_data -- geographic positioning
# ---------------------------------------------------------------------------

def get_react_flow_data(
    graph: nx.DiGraph,
    canvas_width: int = 1400,
    canvas_height: int = 900,
    padding: int = 60,
) -> dict[str, Any]:
    """Convert a NetworkX graph to React Flow format with geographic positioning.

    Uses lat/lon to project nodes onto a map-like canvas. Nodes without
    coordinates are placed in a fallback grid at the bottom.

    Returns:
        Dict with 'nodes' and 'edges' lists suitable for React Flow rendering.
    """
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    # Separate nodes with and without coordinates
    geo_nodes: list[tuple[str, float, float]] = []
    no_geo_nodes: list[tuple[str, dict]] = []

    for node_id, data in graph.nodes(data=True):
        lat = data.get("lat")
        lon = data.get("lon")
        if lat is not None and lon is not None:
            geo_nodes.append((node_id, lat, lon))
        else:
            no_geo_nodes.append((node_id, data))

    # Project geographic nodes
    positions = _geo_to_screen(geo_nodes, canvas_width, canvas_height, padding)

    # Place non-geo nodes in a fallback row at the bottom
    fallback_y = canvas_height + 40
    for idx, (node_id, _data) in enumerate(no_geo_nodes):
        x = padding + (idx % 12) * 120
        y = fallback_y + (idx // 12) * 80
        positions[node_id] = {"x": round(x, 1), "y": round(y, 1)}

    # Build React Flow node list
    for node_id, data in graph.nodes(data=True):
        pos = positions.get(node_id, {"x": 0, "y": 0})
        node_type = data.get("node_type", "unknown")

        # Build data payload, excluding internal keys
        node_data = {"label": data.get("label", node_id)}
        for k, v in data.items():
            if k != "label":
                node_data[k] = v

        nodes.append(
            {
                "id": node_id,
                "type": node_type,
                "data": node_data,
                "position": pos,
            }
        )

    # Build React Flow edge list
    for source, target, data in graph.edges(data=True):
        edge_id = f"{source}->{target}"
        edges.append(
            {
                "id": edge_id,
                "source": source,
                "target": target,
                "label": data.get("label", ""),
                "data": {k: v for k, v in data.items() if k != "label"},
                "animated": data.get("edge_type") == "pipeline",
            }
        )

    return {"nodes": nodes, "edges": edges}


# ---------------------------------------------------------------------------
# trace_paths_to_terminals -- path enumeration for path-to-market
# ---------------------------------------------------------------------------

def trace_paths_to_terminals(
    graph: nx.DiGraph,
    field_npdid: int,
    cutoff: int = 10,
) -> list[dict[str, Any]]:
    """Find all simple paths from a field to every reachable export terminal.

    For each path, calculates cumulative tariff and tracks CO2 content
    changes along the route (CO2 decreases at processing plants with removal).

    Args:
        graph: Infrastructure graph (full or subgraph).
        field_npdid: NPDID of the source field.
        cutoff: Maximum path length (default 10).

    Returns:
        List of path dicts, each containing node_ids, terminal_name,
        total_tariff_nok_sm3, co2 at entry/exit, path_length, and pipelines.
    """
    source_node = f"field_{field_npdid}"
    if source_node not in graph:
        return []

    source_data = graph.nodes[source_node]
    co2_at_entry = source_data.get("co2_mol_pct")

    # Find all terminal nodes
    terminal_nodes = [
        n for n, d in graph.nodes(data=True)
        if d.get("node_type") == "export_terminal"
    ]

    results: list[dict[str, Any]] = []

    for terminal_node in terminal_nodes:
        try:
            all_paths = list(
                nx.all_simple_paths(graph, source_node, terminal_node, cutoff=cutoff)
            )
        except nx.NetworkXError:
            continue

        terminal_data = graph.nodes[terminal_node]

        for path in all_paths[:5]:  # Limit per terminal
            total_tariff = 0.0
            pipelines: list[str] = []
            node_labels: list[str] = []

            # Track CO2 along the path
            current_co2 = co2_at_entry

            for i, node_id in enumerate(path):
                node_data = graph.nodes[node_id]
                node_labels.append(node_data.get("label", node_id))

                # If node is a processing plant with CO2 removal, reduce CO2
                if (
                    node_data.get("node_type") == "processing_plant"
                    and node_data.get("has_co2_removal")
                    and current_co2 is not None
                ):
                    # Assume removal brings CO2 down to 2.5% or by 50%,
                    # whichever is higher
                    current_co2 = min(current_co2, max(2.5, current_co2 * 0.5))

                if i > 0:
                    prev = path[i - 1]
                    edge_data = graph.edges.get((prev, node_id), {})
                    tariff = edge_data.get("tariff_nok_sm3") or 0.0
                    total_tariff += tariff
                    label = edge_data.get("label", "")
                    if label and edge_data.get("edge_type") == "pipeline":
                        pipelines.append(label)

            results.append({
                "node_ids": path,
                "node_labels": node_labels,
                "terminal_name": terminal_data.get("label", terminal_node),
                "total_tariff_nok_sm3": round(total_tariff, 6),
                "co2_at_entry": co2_at_entry,
                "co2_at_exit": round(current_co2, 2) if current_co2 is not None else None,
                "path_length": len(path) - 1,
                "pipelines": pipelines,
            })

    # Sort by total tariff ascending
    results.sort(key=lambda p: p["total_tariff_nok_sm3"])
    return results
