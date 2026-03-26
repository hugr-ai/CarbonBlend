import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { Pathway } from '@/types/scenario';

interface CostBreakdownProps {
  pathways: Pathway[];
}

export function CostBreakdown({ pathways }: CostBreakdownProps) {
  const data = pathways.slice(0, 8).map((p) => {
    const costs: Record<string, number> = {
      name: 0, // placeholder
    };
    const breakdown: Record<string, number> = {};
    p.steps.forEach((step) => {
      const key = step.type;
      breakdown[key] = (breakdown[key] ?? 0) + step.cost_musd_yr;
    });
    return {
      name: p.name,
      removal: breakdown.removal ?? 0,
      transport: breakdown.transport ?? 0,
      storage: breakdown.storage ?? 0,
      processing: breakdown.processing ?? 0,
      blend: breakdown.blend ?? 0,
    };
  });

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Cost Breakdown by Category
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,255,225,0.1)" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#8899bb', fontSize: 10 }}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: '#8899bb', fontSize: 10 }}
            label={{
              value: 'MUSD/yr',
              angle: -90,
              position: 'insideLeft',
              fill: '#8899bb',
              fontSize: 10,
            }}
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
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="removal" name="CO2 Removal" stackId="a" fill="#b8ffe1" />
          <Bar dataKey="transport" name="Transport" stackId="a" fill="#00d4aa" />
          <Bar dataKey="storage" name="Storage" stackId="a" fill="#4a6fa5" />
          <Bar dataKey="processing" name="Processing" stackId="a" fill="#ffa94d" />
          <Bar dataKey="blend" name="Blending" stackId="a" fill="#fcc419" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
