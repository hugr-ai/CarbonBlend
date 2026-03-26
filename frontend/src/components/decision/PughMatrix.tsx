import type { Scenario } from '@/types/scenario';

interface PughMatrixProps {
  scenarios: Scenario[];
}

const criteria = [
  { name: 'Total Cost', category: 'economics' },
  { name: 'CO2 Compliance', category: 'technical' },
  { name: 'Infrastructure Risk', category: 'risk' },
  { name: 'Market Flexibility', category: 'strategic' },
  { name: 'Scalability', category: 'strategic' },
  { name: 'Environmental', category: 'risk' },
];

function score(scenario: Scenario, criterion: string, baselineIdx: number): number {
  // Simple scoring logic based on scenario properties
  const cost = scenario.result?.existing_pathways[0]?.total_cost_musd_yr ?? 100;
  const co2 = scenario.co2_mol_pct;

  switch (criterion) {
    case 'Total Cost':
      return cost < 15 ? 1 : cost < 30 ? 0 : -1;
    case 'CO2 Compliance':
      return co2 <= 2.5 ? 1 : co2 <= 5 ? 0 : -1;
    case 'Infrastructure Risk':
      return scenario.config.strategy === 'direct' ? 1 : scenario.config.strategy === 'full_removal' ? -1 : 0;
    case 'Market Flexibility':
      return scenario.config.target_terminals.length > 2 ? 1 : scenario.config.target_terminals.length > 0 ? 0 : -1;
    case 'Scalability':
      return scenario.gas_flow_rate_mscm_d > 30 ? 1 : 0;
    case 'Environmental':
      return scenario.config.storage_site !== 'None' ? 1 : -1;
    default:
      return 0;
  }
}

function cellColor(val: number): string {
  if (val > 0) return 'bg-success/20 text-success';
  if (val < 0) return 'bg-danger/20 text-danger';
  return 'bg-warning/20 text-warning';
}

export function PughMatrix({ scenarios }: PughMatrixProps) {
  if (scenarios.length < 2) return null;

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Pugh Decision Matrix
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-2 py-2 text-text-secondary font-semibold">
                Criteria
              </th>
              {scenarios.map((s) => (
                <th key={s.id} className="text-center px-2 py-2 text-text-primary font-semibold">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((c) => (
              <tr key={c.name} className="border-b border-border/30">
                <td className="px-2 py-2 text-text-secondary">
                  <span>{c.name}</span>
                  <span className="text-[9px] text-text-secondary/60 ml-1">
                    ({c.category})
                  </span>
                </td>
                {scenarios.map((s, i) => {
                  const val = score(s, c.name, 0);
                  return (
                    <td key={s.id} className="text-center px-2 py-2">
                      <span
                        className={`inline-block w-6 h-6 rounded leading-6 text-center font-semibold ${cellColor(
                          val
                        )}`}
                      >
                        {val > 0 ? '+' : val < 0 ? '-' : '0'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="px-2 py-2 text-text-primary font-semibold">
                Total Score
              </td>
              {scenarios.map((s) => {
                const total = criteria.reduce(
                  (sum, c) => sum + score(s, c.name, 0),
                  0
                );
                return (
                  <td
                    key={s.id}
                    className={`text-center px-2 py-2 font-semibold ${
                      total > 0 ? 'text-success' : total < 0 ? 'text-danger' : 'text-warning'
                    }`}
                  >
                    {total > 0 ? '+' : ''}{total}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
