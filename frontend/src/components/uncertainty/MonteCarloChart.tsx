import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { runMonteCarlo } from '@/api/client';
import { Loader2, Play, BarChart3 } from 'lucide-react';
import { formatCost } from '@/utils/formatters';
import type { MonteCarloResult } from '@/types/scenario';

interface MonteCarloChartProps {
  scenarioId: string;
}

export function MonteCarloChart({ scenarioId }: MonteCarloChartProps) {
  const [triggered, setTriggered] = useState(false);
  const [iterations, setIterations] = useState(1000);

  const { data, isLoading, error, refetch } = useQuery<MonteCarloResult>({
    queryKey: ['monte-carlo', scenarioId, iterations],
    queryFn: () =>
      runMonteCarlo({
        scenario_id: scenarioId,
        iterations,
        uncertain_params: [
          { name: 'co2_mol_pct', distribution: 'triangular', params: { min: 1.5, mode: 3.0, max: 8.0 } },
          { name: 'gas_flow_rate', distribution: 'normal', params: { mean: 20, std: 5 } },
          { name: 'tariff_factor', distribution: 'uniform', params: { min: 0.8, max: 1.2 } },
        ],
      }),
    enabled: triggered,
    staleTime: 60000,
  });

  // Transform histogram data if needed -- support both bin and bin_low/bin_high formats
  const chartData = useMemo(() => {
    if (!data?.histogram) return [];
    return data.histogram.map((h) => {
      if ('bin' in h && typeof h.bin === 'number') {
        return { bin: h.bin, count: h.count };
      }
      // Backend may return bin_low/bin_high format
      const item = h as Record<string, number>;
      const bin_low = item.bin_low ?? item.bin ?? 0;
      const bin_high = item.bin_high ?? bin_low;
      return {
        bin: Number(((bin_low + bin_high) / 2).toFixed(1)),
        count: item.count ?? 0,
      };
    });
  }, [data]);

  if (!triggered) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-teal" />
          <h3 className="text-sm font-semibold text-text-primary">
            Monte Carlo Analysis
          </h3>
        </div>
        <div className="flex flex-col items-center py-6">
          <p className="text-xs text-text-secondary mb-3">
            Run Monte Carlo simulation to analyze cost uncertainty
          </p>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-[10px] text-text-secondary">Iterations:</label>
            <select
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              className="bg-navy border border-border rounded px-2 py-1 text-[10px] text-text-primary"
            >
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
            </select>
          </div>
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-teal" />
          <h3 className="text-sm font-semibold text-text-primary">
            Monte Carlo Distribution
          </h3>
        </div>
        {data && (
          <button
            onClick={() => { refetch(); }}
            className="text-[10px] text-text-secondary hover:text-teal transition-colors"
          >
            Re-run
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-teal animate-spin mb-2" />
          <p className="text-[10px] text-text-secondary">
            Running {iterations.toLocaleString()} iterations...
          </p>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-xs text-danger mb-2">
            Failed to run Monte Carlo analysis
          </p>
          <button
            onClick={() => refetch()}
            className="text-[10px] text-teal hover:text-teal/80"
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Stats cards */}
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

          {/* Histogram chart */}
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
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
                  formatter={(value: number) => [value, 'Count']}
                  labelFormatter={(label: number) => `Cost: ${label.toFixed(1)} MUSD/yr`}
                />
                <ReferenceLine x={data.p10} stroke="#51cf66" strokeDasharray="3 3" label={{ value: 'P10', fill: '#51cf66', fontSize: 9 }} />
                <ReferenceLine x={data.p50} stroke="#b8ffe1" strokeDasharray="3 3" label={{ value: 'P50', fill: '#b8ffe1', fontSize: 9 }} />
                <ReferenceLine x={data.p90} stroke="#ff6b6b" strokeDasharray="3 3" label={{ value: 'P90', fill: '#ff6b6b', fontSize: 9 }} />
                <Bar dataKey="count" fill="#00d4aa" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <p className="text-[10px] text-text-secondary text-center mt-2">
            {data.iterations.toLocaleString()} iterations
          </p>
        </>
      )}
    </div>
  );
}
