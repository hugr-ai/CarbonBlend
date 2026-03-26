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
  operator?: string;
}

export async function getFields(params?: FieldParams): Promise<Field[]> {
  const { data } = await api.get('/fields', { params });
  return data;
}

export async function getField(npdid: number): Promise<Field> {
  const { data } = await api.get(`/fields/${npdid}`);
  return data;
}

export async function getDiscoveries(params?: FieldParams): Promise<Discovery[]> {
  const { data } = await api.get('/discoveries', { params });
  return data;
}

// ── Network Paths ────────────────────────────────────────────────────

export interface PathToTerminal {
  node_ids: string[];
  node_labels: string[];
  terminal_name: string;
  total_tariff_nok_sm3: number;
  co2_at_entry: number | null;
  co2_at_exit: number | null;
  path_length: number;
  pipelines: string[];
}

export async function getPathsToTerminals(
  fieldNpdid: number
): Promise<PathToTerminal[]> {
  const { data } = await api.get(`/network/paths/${fieldNpdid}`);
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
  const { data } = await api.post('/tariffs/route-cost', { route_segments: segments });
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

// ── UMM (Urgent Market Messages) ─────────────────────────────────────

export interface UMMEvent {
  title: string;
  summary: string;
  event_type: string;
  facility: string | null;
  capacity_reduction_pct: number | null;
  start_date: string | null;
  end_date: string | null;
  published: string | null;
  link: string | null;
}

export interface UMMCapacityStatus {
  facility: string;
  status: 'green' | 'amber' | 'red';
  event_count: number;
  active_reductions: UMMEvent[];
  total_capacity_impact_pct: number | null;
  has_active_event: boolean;
}

export async function getUMMEvents(): Promise<UMMEvent[]> {
  const { data } = await api.get('/umm');
  return data;
}

export async function getUMMCapacityStatus(): Promise<UMMCapacityStatus[]> {
  const { data } = await api.get('/umm/capacity-status');
  return data;
}

// ── Scenarios CRUD ────────────────────────────────────────────────────

export async function getScenarios(): Promise<Scenario[]> {
  const { data } = await api.get('/scenarios');
  return (data as Record<string, unknown>[]).map(mapScenarioResponse);
}

export async function createScenario(
  scenario: Omit<Scenario, 'id' | 'created_at'>
): Promise<Scenario> {
  // Map frontend Scenario shape to backend ScenarioCreate shape
  const payload = {
    name: scenario.name,
    description: scenario.description,
    source_field_npdid: scenario.source_field_npdid,
    gas_flow_rate_mscm_d: scenario.gas_flow_rate_mscm_d,
    co2_mol_pct: scenario.co2_mol_pct,
    config_json: {
      ...scenario.config,
      source_field_name: scenario.source_field_name,
    },
  };
  const { data } = await api.post('/scenarios', payload);
  // Map backend response back to frontend Scenario shape
  return mapScenarioResponse(data);
}

function mapScenarioResponse(data: Record<string, unknown>): Scenario {
  const configJson = (data.config_json ?? {}) as Record<string, unknown>;
  const resultJson = data.result_json as Record<string, unknown> | null;
  return {
    id: data.id as string,
    name: data.name as string,
    description: (data.description as string) ?? '',
    source_field_npdid: data.source_field_npdid as number,
    source_field_name: (configJson.source_field_name as string) ?? '',
    gas_flow_rate_mscm_d: data.gas_flow_rate_mscm_d as number,
    co2_mol_pct: data.co2_mol_pct as number,
    config: {
      strategy: (configJson.strategy as ScenarioConfig['strategy']) ?? 'direct',
      target_co2_mol_pct: (configJson.target_co2_mol_pct as number) ?? 2.5,
      target_terminals: (configJson.target_terminals as string[]) ?? [],
      storage_site: (configJson.storage_site as string) ?? '',
      hub_prices: (configJson.hub_prices as Record<string, number>) ?? {},
    },
    result: resultJson as unknown as OptimizationResult | undefined,
    created_at: data.created_at as string,
  };
}

export async function getScenario(id: string): Promise<Scenario> {
  const { data } = await api.get(`/scenarios/${id}`);
  return mapScenarioResponse(data as Record<string, unknown>);
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

// ── Hub Balance ──────────────────────────────────────────────────────

export interface HubFlowStream {
  source?: string;
  destination?: string;
  type: string;
  co2_mol_pct: number | null;
  flow_mscm_d: number | null;
  pipeline: string | null;
}

export interface HubBalance {
  hub_name: string;
  npdid: number;
  inputs: HubFlowStream[];
  outputs: HubFlowStream[];
  blended_co2_mol_pct: number | null;
  total_input_mscm_d: number;
  total_output_mscm_d: number;
  co2_removal_at_hub: boolean;
}

export async function getHubBalance(facilityNpdid: number): Promise<HubBalance> {
  const { data } = await api.get(`/network/hub-balance/${facilityNpdid}`);
  return data;
}

// ── Report Export ────────────────────────────────────────────────────

export async function downloadReport(scenarioId: string): Promise<void> {
  const response = await api.get(`/export/report/${scenarioId}`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `carbonblend-report-${scenarioId}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

// ── Enhanced Route Cost ──────────────────────────────────────────────

export interface SegmentCostDetail {
  pipeline_segment: string;
  baa: string | null;
  k_element: number | null;
  u_element: number | null;
  i_element: number | null;
  o_element: number | null;
  unit_tariff_nok_sm3: number;
  cumulative_tariff_nok_sm3: number;
  year: number | null;
}

export interface EnhancedRouteCostResponse {
  segments: SegmentCostDetail[];
  missing_segments: string[];
  total_k_element: number;
  total_u_element: number;
  total_i_element: number;
  total_o_element: number;
  total_tariff_nok_sm3: number;
  annualized_cost_mnok: number | null;
  num_segments: number;
}

export async function calculateEnhancedRouteCost(
  routeSegments: string[],
  flowRateMscmD?: number,
): Promise<EnhancedRouteCostResponse> {
  const { data } = await api.post('/tariffs/route-cost', {
    route_segments: routeSegments,
    flow_rate_mscm_d: flowRateMscmD,
  });
  return data;
}

export async function getAvailableSegments(): Promise<
  Array<{ pipeline_segment: string; unit_tariff_nok_sm3: number | null }>
> {
  const { data } = await api.get('/tariffs');
  return data.map((t: Record<string, unknown>) => ({
    pipeline_segment: t.pipeline_segment,
    unit_tariff_nok_sm3: t.unit_tariff_nok_sm3,
  }));
}
