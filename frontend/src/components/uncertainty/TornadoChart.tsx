import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { runTornado } from '@/api/client';
import { Loader2, Play } from 'lucide-react';
import type { TornadoItem } from '@/types/scenario';

interface TornadoChartProps {
  scenarioId: string;
}

export function TornadoChart({ scenarioId }: TornadoChartProps) {
  const [triggered, setTriggered] = useState(false);

  const { data, isLoading, error } = useQuery<TornadoItem[]>({
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

  if (!triggered) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Sensitivity Analysis
        </h3>
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
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Tornado Diagram
      </h3>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-teal animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-xs text-danger text-center py-4">
          Failed to run sensitivity analysis
        </p>
      )}

      {data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
          <BarChart
            data={data.map((d) => ({
              name: d.param_name,
              low: d.low_cost - d.base_cost,
              high: d.high_cost - d.base_cost,
              spread: Math.abs(d.high_cost - d.low_cost),
            })).sort((a, b) => b.spread - a.spread)}
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
            />
            <ReferenceLine x={0} stroke="rgba(184,255,225,0.3)" />
            <Bar dataKey="low" name="Low Case" fill="#51cf66" radius={[4, 0, 0, 4]} />
            <Bar dataKey="high" name="High Case" fill="#ff6b6b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
