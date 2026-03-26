import { useQuery } from '@tanstack/react-query';
import {
  getFields,
  getField,
  getDiscoveries,
  type FieldParams,
} from '@/api/client';
import type { Field, Discovery } from '@/types/field';
import type { FieldFiltersState } from '@/stores/scenarioStore';

/** Convert store filters to API query params. */
function filtersToParams(filters: FieldFiltersState): FieldParams {
  const params: FieldParams = {};
  if (filters.area) params.main_area = filters.area;
  if (filters.status) params.status = filters.status;
  if (filters.hc_type) params.hc_type = filters.hc_type;
  if (filters.co2_min != null) params.co2_min = filters.co2_min;
  if (filters.co2_max != null) params.co2_max = filters.co2_max;
  if (filters.operator) params.operator = filters.operator;
  return params;
}

/** Adapt a Discovery to the Field interface for unified display. */
function discoveryToField(d: Discovery): Field {
  return {
    npdid_field: d.npdid_discovery,
    name: d.name,
    main_area: d.main_area,
    status: d.status,
    hc_type: d.hc_type,
    operator: d.operator,
    discovery_year: d.discovery_year,
    lat: d.lat,
    lon: d.lon,
    co2_mol_pct: d.co2_spec?.co2_mol_pct ?? null,
    co2_spec: d.co2_spec,
  };
}

export function useFields(filters?: FieldFiltersState) {
  const assetType = filters?.assetType ?? 'fields';
  const params = filters ? filtersToParams(filters) : {};

  return useQuery({
    queryKey: ['fields', assetType, params],
    queryFn: async (): Promise<Field[]> => {
      if (assetType === 'fields') {
        return getFields(params);
      }
      if (assetType === 'discoveries') {
        const discoveries = await getDiscoveries(params);
        return discoveries.map(discoveryToField);
      }
      // 'all' -- fetch both and merge
      const [fields, discoveries] = await Promise.all([
        getFields(params),
        getDiscoveries(params),
      ]);
      const discoveryFields = discoveries.map(discoveryToField);
      return [...fields, ...discoveryFields];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useField(npdid: number | null) {
  return useQuery({
    queryKey: ['field', npdid],
    queryFn: () => getField(npdid!),
    enabled: npdid !== null,
    staleTime: 5 * 60 * 1000,
  });
}
