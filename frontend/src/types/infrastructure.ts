export interface Pipeline {
  npdid_pipeline: number;
  name: string;
  belongs_to: string;
  operator: string;
  phase: string;
  from_facility: string;
  to_facility: string;
  diameter_inches: number | null;
  medium: string;
  main_grouping: string;
  co2_limit_mol_pct: number;
}

export interface Facility {
  npdid_facility: number;
  name: string;
  kind: string;
  phase: string;
  functions: string;
  belongs_to_name: string;
  operator: string;
  water_depth: number | null;
  lat: number | null;
  lon: number | null;
}

export interface ProcessingPlant {
  id: number;
  name: string;
  capacity_mscm_d: number;
  ngl_capacity_mt_yr: number | null;
  has_co2_removal: boolean;
  lat: number;
  lon: number;
}

export interface ExportTerminal {
  id: number;
  name: string;
  country: string;
  pipeline_feed: string;
  capacity_bcm_yr: number;
  hub_name: string;
  default_price: number;
  currency: string;
  lat: number;
  lon: number;
}

export interface Hub {
  npdid_facility: number;
  name: string;
  function_desc: string;
  key_inputs: string;
  key_outputs: string;
  co2_relevance: string;
}
