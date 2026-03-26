import { useCallback, useMemo, useState } from 'react';
import MapGL, {
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  type MapLayerMouseEvent,
  type ViewStateChangeEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';
import { getFacilities, getPipelines, getProcessingPlants, getExportTerminals } from '@/api/client';
import { useScenarioStore } from '@/stores/scenarioStore';
import { useFields } from '@/hooks/useFields';
import { getCO2Color } from '@/utils/co2Calculations';
import { CO2Legend } from '@/components/co2-overlay/CO2Legend';
import { CO2Tooltip } from '@/components/co2-overlay/CO2Tooltip';
import type { Field } from '@/types/field';

// Inline dark map style
const darkStyle = {
  version: 8 as const,
  name: 'CarbonBlend Dark',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'osm-tiles': {
      type: 'raster' as const,
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: { 'background-color': '#0a1628' },
    },
    {
      id: 'osm-tiles',
      type: 'raster' as const,
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

interface HoverInfo {
  x: number;
  y: number;
  name: string;
  co2?: number | null;
  source?: string;
  type: string;
}

export function MapView() {
  const [viewState, setViewState] = useState({
    longitude: 3.5,
    latitude: 62,
    zoom: 5,
  });
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const selectedFieldNpdid = useScenarioStore((s) => s.selectedFieldNpdid);
  const setSelectedField = useScenarioStore((s) => s.setSelectedField);

  const { data: fields } = useFields();
  const { data: facilities } = useQuery({ queryKey: ['facilities'], queryFn: getFacilities, staleTime: 300000 });
  const { data: plants } = useQuery({ queryKey: ['processing-plants'], queryFn: getProcessingPlants, staleTime: 300000 });
  const { data: terminals } = useQuery({ queryKey: ['export-terminals'], queryFn: getExportTerminals, staleTime: 300000 });

  // Build GeoJSON for fields
  const fieldGeoJSON = useMemo(() => {
    if (!fields) return null;
    return {
      type: 'FeatureCollection' as const,
      features: fields
        .filter((f: Field) => f.lat != null && f.lon != null)
        .map((f: Field) => ({
          type: 'Feature' as const,
          properties: {
            npdid: f.npdid_field,
            name: f.name,
            co2: f.co2_mol_pct ?? null,
            color: f.co2_mol_pct != null ? getCO2Color(f.co2_mol_pct) : '#555555',
            source: null,
            status: f.status,
            selected: f.npdid_field === selectedFieldNpdid ? 1 : 0,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [f.lon!, f.lat!],
          },
        })),
    };
  }, [fields, selectedFieldNpdid]);

  // Build GeoJSON for facilities
  const facilityGeoJSON = useMemo(() => {
    if (!facilities) return null;
    return {
      type: 'FeatureCollection' as const,
      features: facilities
        .filter((f) => f.lat != null && f.lon != null)
        .map((f) => ({
          type: 'Feature' as const,
          properties: {
            name: f.name,
            kind: f.kind,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [f.lon!, f.lat!],
          },
        })),
    };
  }, [facilities]);

  // Build GeoJSON for processing plants
  const plantGeoJSON = useMemo(() => {
    if (!plants) return null;
    return {
      type: 'FeatureCollection' as const,
      features: plants.map((p) => ({
        type: 'Feature' as const,
        properties: {
          name: p.name,
          capacity: p.capacity_mscm_d,
          hasCO2Removal: p.has_co2_removal,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lon, p.lat],
        },
      })),
    };
  }, [plants]);

  // Build GeoJSON for terminals
  const terminalGeoJSON = useMemo(() => {
    if (!terminals) return null;
    return {
      type: 'FeatureCollection' as const,
      features: terminals.map((t) => ({
        type: 'Feature' as const,
        properties: {
          name: t.name,
          country: t.country,
          hub: t.hub_name,
          price: t.default_price,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [t.lon, t.lat],
        },
      })),
    };
  }, [terminals]);

  const onHover = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature && feature.properties) {
      setHoverInfo({
        x: event.point.x,
        y: event.point.y,
        name: feature.properties.name as string,
        co2: feature.properties.co2 as number | null,
        source: feature.properties.source as string | undefined,
        type: feature.layer?.id?.includes('field') ? 'Field' :
              feature.layer?.id?.includes('plant') ? 'Processing Plant' :
              feature.layer?.id?.includes('terminal') ? 'Terminal' : 'Facility',
      });
    } else {
      setHoverInfo(null);
    }
  }, []);

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (feature?.properties?.npdid) {
        const npdid = feature.properties.npdid as number;
        setSelectedField(npdid === selectedFieldNpdid ? null : npdid);
      }
    },
    [selectedFieldNpdid, setSelectedField]
  );

  return (
    <div className="w-full h-full relative">
      <MapGL
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        onMouseMove={onHover}
        onClick={onClick}
        mapStyle={darkStyle}
        interactiveLayerIds={['field-circles', 'facility-circles', 'plant-circles', 'terminal-circles']}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* Field circles */}
        {fieldGeoJSON && (
          <Source id="fields" type="geojson" data={fieldGeoJSON}>
            <Layer
              id="field-circles"
              type="circle"
              paint={{
                'circle-radius': [
                  'case',
                  ['==', ['get', 'selected'], 1],
                  10,
                  6,
                ],
                'circle-color': ['get', 'color'],
                'circle-opacity': 0.85,
                'circle-stroke-width': [
                  'case',
                  ['==', ['get', 'selected'], 1],
                  3,
                  1,
                ],
                'circle-stroke-color': [
                  'case',
                  ['==', ['get', 'selected'], 1],
                  '#b8ffe1',
                  'rgba(255,255,255,0.3)',
                ],
              }}
            />
            <Layer
              id="field-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 10,
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
              }}
              paint={{
                'text-color': '#e8edf5',
                'text-halo-color': '#00104d',
                'text-halo-width': 1,
              }}
              minzoom={7}
            />
          </Source>
        )}

        {/* Facility circles */}
        {facilityGeoJSON && (
          <Source id="facilities" type="geojson" data={facilityGeoJSON}>
            <Layer
              id="facility-circles"
              type="circle"
              paint={{
                'circle-radius': 4,
                'circle-color': '#4a6fa5',
                'circle-opacity': 0.7,
                'circle-stroke-width': 1,
                'circle-stroke-color': 'rgba(255,255,255,0.2)',
              }}
              minzoom={6}
            />
          </Source>
        )}

        {/* Processing plant markers */}
        {plantGeoJSON && (
          <Source id="plants" type="geojson" data={plantGeoJSON}>
            <Layer
              id="plant-circles"
              type="circle"
              paint={{
                'circle-radius': 8,
                'circle-color': '#00d4aa',
                'circle-opacity': 0.9,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#b8ffe1',
              }}
            />
            <Layer
              id="plant-labels"
              type="symbol"
              layout={{
                'text-field': ['concat', ['get', 'name'], '\n', ['to-string', ['get', 'capacity']], ' MSm\u00B3/d'],
                'text-size': 11,
                'text-offset': [0, 2],
                'text-anchor': 'top',
              }}
              paint={{
                'text-color': '#b8ffe1',
                'text-halo-color': '#00104d',
                'text-halo-width': 1.5,
              }}
            />
          </Source>
        )}

        {/* Terminal markers */}
        {terminalGeoJSON && (
          <Source id="terminals" type="geojson" data={terminalGeoJSON}>
            <Layer
              id="terminal-circles"
              type="circle"
              paint={{
                'circle-radius': 7,
                'circle-color': '#ffa94d',
                'circle-opacity': 0.9,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              }}
            />
            <Layer
              id="terminal-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 11,
                'text-offset': [0, 1.8],
                'text-anchor': 'top',
              }}
              paint={{
                'text-color': '#ffa94d',
                'text-halo-color': '#00104d',
                'text-halo-width': 1.5,
              }}
            />
          </Source>
        )}
      </MapGL>

      <CO2Legend />

      {hoverInfo && (
        <CO2Tooltip
          x={hoverInfo.x}
          y={hoverInfo.y}
          name={hoverInfo.name}
          co2={hoverInfo.co2}
          source={hoverInfo.source}
          type={hoverInfo.type}
        />
      )}
    </div>
  );
}
