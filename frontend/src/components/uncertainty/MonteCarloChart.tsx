import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { runMonteCarlo } from '@/api/client';
import { Loader2, Play } from 'lucide-react';
import { formatCost } from '@/utils/formatters';
import type { MonteCarloResult } from '@/types/scenario';

interface MonteCarloChartProps {
  scenarioId: string;
}

export function MonteCarloChart({ scenarioId }: MonteCarloChartProps) {
  const [triggered, setTriggered] = useState(false);

  const { data, isLoading, error } = useQuery<MonteCarloResult>({
    queryKey: ['monte-carlo', scenarioId],
    queryFn: () =>
      runMonteCarlo({
        scenario_id: scenarioId,
        iterations: 10000,
        uncertain_params: [
          { name: 'co2_mol_pct', distribution: 'triangular', params: { min: 1.5, mode: 3.0, max: 8.0 } },
          { name: 'gas_flow_rate', distribution: 'normal', params: { mean: 20, std: 5 } },
          { name: 'tariff_factor', distribution: 'uniform', params: { min: 0.8, max: 1.2 } },
        ],
      }),
    enabled: triggered,
    staleTime: 60000,
  });

  if (!triggered) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Monte Carlo Analysis
        </h3>
        <div className="flex flex-col items-center py-6">
          <p className="text-xs text-text-secondary mb-3">
            Run 10,000 iterations to analyze cost uncertainty
          </p>
          <button
            onClick={() => setTriggered(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal text-navy rounded-lg text-xs font-medium hover:bg-teal/90 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Run Monte Carlo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Monte Carlo Distribution
      </h3>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-teal animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-xs text-danger text-center py-4">
          Failed to run Monte Carlo analysis
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
            <div className="bg-navy rounded-lg p-2">
              <span className="text-text-secondary">P10</span>
              <p className="font-mono text-text-primary">{formatCost(data.p10)}</p>
            </div>
            <div className="bg-navy rounded-lg p-2">
              <span className="text-text-secondary">P50</span>
              <p className="font-mono text-teal">{formatCost(data.p50)}</p>
            </div>
            <div className="bg-navy rounded-lg p-2">
              <span className="text-text-secondary">P90</span>
              <p className="font-mono text-text-primary">{formatCost(data.p90)}</p>
            </div>
            <div className="bg-navy rounded-lg p-2">
              <span className="text-text-secondary">Mean</span>
              <p className="font-mono text-text-primary">{formatCost(data.mean)}</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.histogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,255,225,0.1)" />
              <XAxis
                dataKey="bin"
                tick={{ fill: '#8899bb', fontSize: 9 }}
                tickFormatter={(v: number) => v.toFixed(0)}
              />
              <YAxis tick={{ fill: '#8899bb', fontSize: 9 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a1628',
                  border: '1px solid rgba(184,255,225,0.15)',
                  borderRadius: 8,
                  color: '#e8edf5',
                  fontSize: 11,
                }}
              />
              <ReferenceLine x={data.p10} stroke="#51cf66" strokeDasharray="3 3" label={{ value: 'P10', fill: '#51cf66', fontSize: 9 }} />
              <ReferenceLine x={data.p50} stroke="#b8ffe1" strokeDasharray="3 3" label={{ value: 'P50', fill: '#b8ffe1', fontSize: 9 }} />
              <ReferenceLine x={data.p90} stroke="#ff6b6b" strokeDasharray="3 3" label={{ value: 'P90', fill: '#ff6b6b', fontSize: 9 }} />
              <Bar dataKey="count" fill="#00d4aa" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <p className="text-[10px] text-text-secondary text-center mt-2">
            {data.iterations.toLocaleString()} iterations
          </p>
        </>
      )}
    </div>
  );
}
