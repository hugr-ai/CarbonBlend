import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { runTornado } from '@/api/client';
import { Loader2, Play, ArrowDownUp } from 'lucide-react';
import type { TornadoItem } from '@/types/scenario';

interface TornadoChartProps {
  scenarioId: string;
}

export function TornadoChart({ scenarioId }: TornadoChartProps) {
  const [triggered, setTriggered] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<TornadoItem[]>({
    queryKey: ['tornado', scenarioId],
    queryFn: () =>
      runTornado({
        scenario_id: scenarioId,
        params: [
          { name: 'CO2 Content', low: 1.0, high: 8.0 },
          { name: 'Gas Flow Rate', low: 10, high: 40 },
          { name: 'Tariff Factor', low: 0.7, high: 1.3 },
          { name: 'Storage Cost', low: 15, high: 50 },
          { name: 'Removal Efficiency', low: 0.85, high: 0.99 },
        ],
      }),
    enabled: triggered,
    staleTime: 60000,
  });

  // Transform and sort data by impact spread (widest bars at top)
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .map((d) => ({
        name: d.param_name,
        low: d.low_cost - d.base_cost,
        high: d.high_cost - d.base_cost,
        spread: Math.abs(d.high_cost - d.low_cost),
        lowValue: d.low_value,
        highValue: d.high_value,
        baseCost: d.base_cost,
      }))
      .sort((a, b) => b.spread - a.spread);
  }, [data]);

  if (!triggered) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownUp className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-text-primary">
            Sensitivity Analysis
          </h3>
        </div>
        <div className="flex flex-col items-center py-6">
          <p className="text-xs text-text-secondary mb-3">
            Identify which parameters most affect cost
          </p>
          <button
            onClick={() => setTriggered(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal text-navy rounded-lg text-xs font-medium hover:bg-teal/90 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Run Tornado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ArrowDownUp className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-text-primary">
            Tornado Diagram
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
            Running sensitivity analysis...
          </p>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-xs text-danger mb-2">
            Failed to run sensitivity analysis
          </p>
          <button
            onClick={() => refetch()}
            className="text-[10px] text-teal hover:text-teal/80"
          >
            Retry
          </button>
        </div>
      )}

      {chartData.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
            <BarChart
              data={chartData}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,255,225,0.1)" />
              <XAxis
                type="number"
                tick={{ fill: '#8899bb', fontSize: 9 }}
                label={{
                  value: 'Cost Change (MUSD/yr)',
                  position: 'bottom',
                  fill: '#8899bb',
                  fontSize: 10,
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#e8edf5', fontSize: 10 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a1628',
                  border: '1px solid rgba(184,255,225,0.15)',
                  borderRadius: 8,
                  color: '#e8edf5',
                  fontSize: 11,
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} MUSD/yr`,
                  name === 'low' ? 'Low Case' : 'High Case',
                ]}
              />
              <ReferenceLine x={0} stroke="rgba(184,255,225,0.3)" />
              <Bar dataKey="low" name="Low Case" fill="#51cf66" radius={[4, 0, 0, 4]} />
              <Bar dataKey="high" name="High Case" fill="#ff6b6b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Parameter summary table */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-2 py-1 text-text-secondary">Parameter</th>
                  <th className="text-right px-2 py-1 text-text-secondary">Spread (MUSD/yr)</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d) => (
                  <tr key={d.name} className="border-b border-border/20">
                    <td className="px-2 py-1 text-text-primary">{d.name}</td>
                    <td className="px-2 py-1 text-right font-mono text-warning">
                      {d.spread.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && data.length === 0 && (
        <p className="text-xs text-text-secondary text-center py-4">
          No sensitivity data available
        </p>
      )}
    </div>
  );
}
