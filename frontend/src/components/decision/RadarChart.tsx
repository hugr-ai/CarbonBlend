import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Scenario } from '@/types/scenario';

interface RadarChartProps {
  scenarios: Scenario[];
}

const categories = ['Economics', 'Technical', 'Risk', 'Strategic'];
const colors = ['#b8ffe1', '#00d4aa', '#ffa94d', '#4a6fa5'];

function categoryScore(scenario: Scenario, category: string): number {
  const cost = scenario.result?.existing_pathways[0]?.total_cost_musd_yr ?? 50;
  const co2 = scenario.co2_mol_pct;

  switch (category) {
    case 'Economics':
      return Math.max(0, Math.min(100, 100 - cost * 2));
    case 'Technical':
      return co2 <= 2.5 ? 90 : co2 <= 5 ? 60 : 30;
    case 'Risk': {
      let riskScore = 50;
      if (scenario.config.strategy === 'direct') riskScore = 80;
      if (scenario.config.strategy === 'full_removal') riskScore = 30;
      if (scenario.config.storage_site !== 'None') riskScore += 10;
      return Math.min(100, riskScore);
    }
    case 'Strategic':
      return Math.min(100, 30 + scenario.config.target_terminals.length * 15 + scenario.gas_flow_rate_mscm_d);
    default:
      return 50;
  }
}

export function RadarChart({ scenarios }: RadarChartProps) {
  if (scenarios.length < 2) return null;

  const data = categories.map((cat) => {
    const entry: Record<string, string | number> = { category: cat };
    scenarios.forEach((s) => {
      entry[s.name] = categoryScore(s, cat);
    });
    return entry;
  });

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Multi-Criteria Radar
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <RechartsRadar cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(184,255,225,0.15)" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: '#8899bb', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#8899bb', fontSize: 9 }}
          />
          {scenarios.map((s, i) => (
            <Radar
              key={s.id}
              name={s.name}
              dataKey={s.name}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11, color: '#e8edf5' }} />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
