export interface Scenario {
  id: string;
  name: string;
  description: string;
  source_field_npdid: number;
  source_field_name: string;
  gas_flow_rate_mscm_d: number;
  co2_mol_pct: number;
  config: ScenarioConfig;
  result?: OptimizationResult;
  created_at: string;
}

export interface ScenarioConfig {
  strategy: 'full_removal' | 'partial_removal_blend' | 'blend_only' | 'direct';
  target_co2_mol_pct: number;
  target_terminals: string[];
  storage_site: string;
  hub_prices: Record<string, number>;
  uncertain_params?: UncertainParam[];
}

export interface UncertainParam {
  name: string;
  distribution: 'triangular' | 'normal' | 'lognormal' | 'uniform';
  params: Record<string, number>;
}

export interface OptimizationResult {
  existing_pathways: Pathway[];
  bridge_pathways: Pathway[];
  bridges: BridgeOpportunity[];
}

export interface Pathway {
  rank: number;
  name: string;
  total_cost_musd_yr: number;
  co2_removed_mtpa: number;
  co2_stored_mtpa: number;
  steps: PathwayStep[];
  terminal: string;
  tariff_breakdown: TariffBreakdown;
}

export interface PathwayStep {
  type: 'removal' | 'transport' | 'blend' | 'storage' | 'processing';
  location: string;
  description: string;
  co2_in: number;
  co2_out: number;
  cost_musd_yr: number;
}

export interface BridgeOpportunity {
  type: string;
  description: string;
  capex_musd: number;
  annual_savings_musd: number;
  payback_years: number;
  npv_musd: number;
  risk_rating: 'low' | 'medium' | 'high';
}

export interface TariffBreakdown {
  segments: { name: string; k: number; u: number; i: number; o: number; total: number }[];
  total_nok_sm3: number;
  total_musd_yr: number;
}

export interface MonteCarloResult {
  p10: number;
  p50: number;
  p90: number;
  mean: number;
  histogram: { bin: number; count: number }[];
  iterations: number;
}

export interface TornadoItem {
  param_name: string;
  low_value: number;
  high_value: number;
  low_cost: number;
  high_cost: number;
  base_cost: number;
}

export interface RiskItem {
  category: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface DecisionComparison {
  scenarios: string[];
  criteria: DecisionCriterion[];
  pugh_matrix: Record<string, Record<string, number>>;
  weighted_scores: Record<string, number>;
  ranking: string[];
  pareto_optimal: string[];
}

export interface DecisionCriterion {
  name: string;
  category: 'economics' | 'technical' | 'risk' | 'strategic';
  weight: number;
  type: 'quantitative' | 'qualitative';
  unit: string;
}
