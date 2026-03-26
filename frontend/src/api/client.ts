import axios from 'axios';
import type { Field, Discovery } from '@/types/field';
import type {
  Pipeline,
  Facility,
  ProcessingPlant,
  ExportTerminal,
  Hub,
} from '@/types/infrastructure';
import type {
  Scenario,
  ScenarioConfig,
  OptimizationResult,
  MonteCarloResult,
  TornadoItem,
  RiskItem,
  DecisionComparison,
} from '@/types/scenario';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Fields & Discoveries ──────────────────────────────────────────────

export interface FieldParams {
  main_area?: string;
  status?: string;
  hc_type?: string;
  co2_min?: number;
  co2_max?: number;
  search?: string;
}

export async function getFields(params?: FieldParams): Promise<Field[]> {
  const { data } = await api.get('/fields', { params });
  return data;
}

export async function getField(npdid: number): Promise<Field> {
  const { data } = await api.get(`/fields/${npdid}`);
  return data;
}

export async function getDiscoveries(): Promise<Discovery[]> {
  const { data } = await api.get('/discoveries');
  return data;
}

// ── Infrastructure ────────────────────────────────────────────────────

export async function getPipelines(): Promise<Pipeline[]> {
  const { data } = await api.get('/pipelines');
  return data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPipelineGeoJSON(): Promise<any> {
  const { data } = await api.get('/pipelines/geojson');
  return data;
}

export async function getFacilities(): Promise<Facility[]> {
  const { data } = await api.get('/facilities');
  return data;
}

export async function getProcessingPlants(): Promise<ProcessingPlant[]> {
  const { data } = await api.get('/processing-plants');
  return data;
}

export async function getExportTerminals(): Promise<ExportTerminal[]> {
  const { data } = await api.get('/export-terminals');
  return data;
}

export async function getHubs(): Promise<Hub[]> {
  const { data } = await api.get('/hubs');
  return data;
}

// ── Network Graph ─────────────────────────────────────────────────────

export interface NetworkData {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    data: Record<string, unknown>;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    data: Record<string, unknown>;
  }>;
}

export async function getNetwork(centerOnField?: number): Promise<NetworkData> {
  const { data } = await api.get('/network', {
    params: centerOnField ? { center_field: centerOnField } : undefined,
  });
  return data;
}

export async function getSubgraph(
  fieldNpdid: number,
  depth?: number
): Promise<NetworkData> {
  const { data } = await api.get(`/network/subgraph/${fieldNpdid}`, {
    params: depth ? { depth } : undefined,
  });
  return data;
}

// ── CO2 Blending ──────────────────────────────────────────────────────

export interface BlendStream {
  name: string;
  flow_rate: number;
  co2_mol_pct: number;
}

export interface BlendResult {
  blended_co2_mol_pct: number;
  total_flow_rate: number;
  streams: BlendStream[];
}

export async function calculateBlend(
  streams: BlendStream[]
): Promise<BlendResult> {
  const { data } = await api.post('/blend/calculate', { streams });
  return data;
}

export async function getStorageSites(): Promise<
  Array<{ id: string; name: string; capacity_mtpa: number; cost_per_ton: number }>
> {
  const { data } = await api.get('/storage-sites');
  return data;
}

export async function getProcessingOptions(): Promise<
  Array<{ id: string; name: string; co2_removal_efficiency: number; cost_musd_yr: number }>
> {
  const { data } = await api.get('/processing-options');
  return data;
}

// ── Tariffs ───────────────────────────────────────────────────────────

export async function getTariffs(): Promise<
  Array<{ segment: string; k: number; u: number; i: number; o: number; total: number }>
> {
  const { data } = await api.get('/tariffs');
  return data;
}

export async function calculateRouteCost(
  segments: string[]
): Promise<{ total_nok_sm3: number; total_musd_yr: number; breakdown: unknown[] }> {
  const { data } = await api.post('/tariffs/route-cost', { segments });
  return data;
}

// ── Markets ───────────────────────────────────────────────────────────

export async function getMarkets(): Promise<
  Array<{ hub: string; price: number; currency: string; terminals: string[] }>
> {
  const { data } = await api.get('/markets');
  return data;
}

export async function getUMM(): Promise<
  Array<{ id: string; facility: string; type: string; start: string; end: string; capacity_impact: number }>
> {
  const { data } = await api.get('/markets/umm');
  return data;
}

export async function getCapacityStatus(): Promise<
  Array<{ pipeline: string; utilization_pct: number; spare_mscm_d: number }>
> {
  const { data } = await api.get('/markets/capacity');
  return data;
}

// ── Scenarios CRUD ────────────────────────────────────────────────────

export async function getScenarios(): Promise<Scenario[]> {
  const { data } = await api.get('/scenarios');
  return data;
}

export async function createScenario(
  scenario: Omit<Scenario, 'id' | 'created_at'>
): Promise<Scenario> {
  const { data } = await api.post('/scenarios', scenario);
  return data;
}

export async function getScenario(id: string): Promise<Scenario> {
  const { data } = await api.get(`/scenarios/${id}`);
  return data;
}

export async function updateScenario(
  id: string,
  updates: Partial<Scenario>
): Promise<Scenario> {
  const { data } = await api.patch(`/scenarios/${id}`, updates);
  return data;
}

export async function deleteScenario(id: string): Promise<void> {
  await api.delete(`/scenarios/${id}`);
}

// ── Optimization ──────────────────────────────────────────────────────

export async function runOptimization(
  config: ScenarioConfig & { source_field_npdid: number; gas_flow_rate_mscm_d: number; co2_mol_pct: number }
): Promise<{ job_id: string }> {
  const { data } = await api.post('/optimize', config);
  return data;
}

export async function getOptimizationResult(
  jobId: string
): Promise<{ status: 'pending' | 'running' | 'complete' | 'failed'; result?: OptimizationResult; error?: string }> {
  const { data } = await api.get(`/optimize/${jobId}`);
  return data;
}

export async function runBridgeFinder(
  config: ScenarioConfig & { source_field_npdid: number }
): Promise<{ bridges: Array<{ type: string; description: string; capex_musd: number; annual_savings_musd: number; payback_years: number; npv_musd: number; risk_rating: string }> }> {
  const { data } = await api.post('/optimize/bridges', config);
  return data;
}

// ── Uncertainty Analysis ──────────────────────────────────────────────

export async function runMonteCarlo(config: {
  scenario_id: string;
  iterations?: number;
  uncertain_params: Array<{ name: string; distribution: string; params: Record<string, number> }>;
}): Promise<MonteCarloResult> {
  const { data } = await api.post('/uncertainty/monte-carlo', config);
  return data;
}

export async function runTornado(config: {
  scenario_id: string;
  params: Array<{ name: string; low: number; high: number }>;
}): Promise<TornadoItem[]> {
  const { data } = await api.post('/uncertainty/tornado', config);
  return data;
}

export async function getRiskRegister(
  scenarioId: string
): Promise<RiskItem[]> {
  const { data } = await api.get(`/risk/${scenarioId}`);
  return data;
}

// ── Decision Support ──────────────────────────────────────────────────

export async function compareDecisions(
  scenarios: string[],
  weights?: Record<string, number>
): Promise<DecisionComparison> {
  const { data } = await api.post('/decisions/compare', { scenarios, weights });
  return data;
}

export async function weightSensitivity(requestData: {
  scenarios: string[];
  vary_category: string;
  range: [number, number];
  steps: number;
}): Promise<Array<{ weight: number; scores: Record<string, number> }>> {
  const { data } = await api.post('/decisions/weight-sensitivity', requestData);
  return data;
}

export async function valueOfInformation(requestData: {
  scenario_id: string;
  param: string;
  reduction_pct: number;
}): Promise<{ voi_musd: number; recommendation: string }> {
  const { data } = await api.post('/decisions/voi', requestData);
  return data;
}
