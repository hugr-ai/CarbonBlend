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
        const { job_id } = await runOptimization(config);
        setState((s) => ({ ...s, status: 'running', jobId: job_id }));

        pollRef.current = setInterval(async () => {
          try {
            const poll = await getOptimizationResult(job_id);

            if (poll.status === 'complete' && poll.result) {
              stopPolling();
              setState({
                status: 'complete',
                result: poll.result,
                error: null,
                jobId: job_id,
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
                jobId: job_id,
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
