export interface Field {
  npdid_field: number;
  name: string;
  main_area: string | null;
  status: string | null;
  hc_type: string | null;
  operator: string | null;
  discovery_year: number | null;
  lat: number | null;
  lon: number | null;
  co2_mol_pct: number | null;
  co2_spec?: CO2Spec | null;
}

export interface Discovery {
  npdid_discovery: number;
  name: string;
  main_area: string;
  status: string;
  hc_type: string;
  operator: string;
  discovery_year: number | null;
  lat: number | null;
  lon: number | null;
  co2_spec?: CO2Spec | null;
}

export interface CO2Spec {
  co2_mol_pct: number;
  co2_mol_pct_range_low: number | null;
  co2_mol_pct_range_high: number | null;
  source: string;
}
