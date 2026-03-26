import { useState, useCallback, useRef, useEffect } from 'react';
import { runOptimization, getOptimizationResult } from '@/api/client';
import { useScenarioStore } from '@/stores/scenarioStore';
import type { ScenarioConfig, OptimizationResult } from '@/types/scenario';

interface OptimizationState {
  status: 'idle' | 'pending' | 'running' | 'complete' | 'failed';
  result: OptimizationResult | null;
  error: string | null;
  jobId: string | null;
}

/**
 * Map the backend optimization response (which has pathways with route_nodes,
 * route_edges, total_annual_cost_mnok, etc.) to the frontend OptimizationResult shape.
 */
function mapBackendResult(raw: Record<string, unknown>): OptimizationResult {
  const pathways = (raw.pathways as Array<Record<string, unknown>>) ?? [];

  const existingPathways = pathways.map((p, idx) => ({
    rank: idx + 1,
    name: `${(p.terminal as string) ?? 'Unknown'} via ${((p.route_nodes as Array<Record<string, unknown>>) ?? []).map((n) => n.label).join(' > ')}`,
    total_cost_musd_yr: ((p.total_annual_cost_mnok as number) ?? 0) / 10.5, // rough MNOK->MUSD
    co2_removed_mtpa: 0,
    co2_stored_mtpa: 0,
    steps: ((p.route_nodes as Array<Record<string, unknown>>) ?? []).map((n) => ({
      type: 'transport' as const,
      location: (n.label as string) ?? '',
      description: (n.type as string) ?? '',
      co2_in: (raw.co2_mol_pct as number) ?? 0,
      co2_out: (raw.co2_target_mol_pct as number) ?? 2.5,
      cost_musd_yr: 0,
    })),
    terminal: (p.terminal as string) ?? '',
    tariff_breakdown: {
      segments: [],
      total_nok_sm3: (p.total_tariff_nok_sm3 as number) ?? 0,
      total_musd_yr: ((p.annual_tariff_mnok as number) ?? 0) / 10.5,
    },
  }));

  return {
    existing_pathways: existingPathways,
    bridge_pathways: [],
    bridges: [],
  };
}

export function useOptimization() {
  const [state, setState] = useState<OptimizationState>({
    status: 'idle',
    result: null,
    error: null,
    jobId: null,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateScenario = useScenarioStore((s) => s.updateScenario);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  const run = useCallback(
    async (config: ScenarioConfig & {
      source_field_npdid: number;
      gas_flow_rate_mscm_d: number;
      co2_mol_pct: number;
    }) => {
      stopPolling();
      setState({ status: 'pending', result: null, error: null, jobId: null });

      try {
        // The backend runs synchronously and returns the full result
        // alongside the job_id in a single response.
        const response = await runOptimization(config);
        const raw = response as unknown as Record<string, unknown>;
        const jobId = (raw.job_id as string) ?? null;

        // Check if the result was returned inline (sync mode)
        if (raw.status === 'ok' && raw.pathways) {
          const mapped = mapBackendResult(raw);
          setState({
            status: 'complete',
            result: mapped,
            error: null,
            jobId: jobId,
          });
          if (activeScenarioId) {
            updateScenario(activeScenarioId, { result: mapped });
          }
          return;
        }

        // Otherwise fall back to polling
        setState((s) => ({ ...s, status: 'running', jobId: jobId }));

        pollRef.current = setInterval(async () => {
          try {
            const poll = await getOptimizationResult(jobId!);

            if (poll.status === 'complete' && poll.result) {
              stopPolling();
              setState({
                status: 'complete',
                result: poll.result,
                error: null,
                jobId: jobId,
              });

              if (activeScenarioId) {
                updateScenario(activeScenarioId, { result: poll.result });
              }
            } else if (poll.status === 'failed') {
              stopPolling();
              setState({
                status: 'failed',
                result: null,
                error: poll.error ?? 'Optimization failed',
                jobId: jobId,
              });
            }
          } catch {
            stopPolling();
            setState((s) => ({
              ...s,
              status: 'failed',
              error: 'Lost connection to server',
            }));
          }
        }, 2000);
      } catch (err) {
        setState({
          status: 'failed',
          result: null,
          error: err instanceof Error ? err.message : 'Failed to start optimization',
          jobId: null,
        });
      }
    },
    [stopPolling, activeScenarioId, updateScenario]
  );

  return { ...state, run, stopPolling };
}
