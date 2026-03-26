import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useScenarioStore } from '@/stores/scenarioStore';
import { formatCost, formatFlow } from '@/utils/formatters';
import { formatCO2, getCO2Color } from '@/utils/co2Calculations';
import { PughMatrix } from '@/components/decision/PughMatrix';
import { RadarChart as DecisionRadar } from '@/components/decision/RadarChart';
import { WeightSliders } from '@/components/decision/WeightSliders';

export function ScenarioComparison() {
  const scenarios = useScenarioStore((s) => s.scenarios);
  const comparisonIds = useScenarioStore((s) => s.comparisonIds);
  const addToComparison = useScenarioStore((s) => s.addToComparison);
  const removeFromComparison = useScenarioStore((s) => s.removeFromComparison);

  const comparedScenarios = useMemo(
    () => scenarios.filter((s) => comparisonIds.includes(s.id)),
    [scenarios, comparisonIds]
  );

  const costData = useMemo(
    () =>
      comparedScenarios.map((s) => ({
        name: s.name,
        cost: s.result?.existing_pathways[0]?.total_cost_musd_yr ?? 0,
        co2Removed: s.result?.existing_pathways[0]?.co2_removed_mtpa ?? 0,
        co2Stored: s.result?.existing_pathways[0]?.co2_stored_mtpa ?? 0,
      })),
    [comparedScenarios]
  );

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Scenario Comparison
        </h2>
        <p className="text-sm text-text-secondary">
          Select 2-4 scenarios to compare side by side
        </p>
      </div>

      {/* Scenario selector */}
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => {
          const selected = comparisonIds.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() =>
                selected ? removeFromComparison(s.id) : addToComparison(s.id)
              }
              disabled={!selected && comparisonIds.length >= 4}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selected
                  ? 'bg-teal text-navy'
                  : 'bg-surface border border-border text-text-secondary hover:border-teal/30 disabled:opacity-30'
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {comparedScenarios.length < 2 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-text-secondary text-sm">
            Select at least 2 scenarios to compare
          </p>
        </div>
      ) : (
        <>
          {/* Cost comparison chart */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Cost Comparison
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,255,225,0.1)" />
                <XAxis dataKey="name" tick={{ fill: '#8899bb', fontSize: 11 }} />
                <YAxis tick={{ fill: '#8899bb', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a1628',
                    border: '1px solid rgba(184,255,225,0.15)',
                    borderRadius: 8,
                    color: '#e8edf5',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cost" name="Total Cost (MUSD/yr)" fill="#b8ffe1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="co2Removed" name="CO2 Removed (MTPA)" fill="#00d4aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Side-by-side table */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs text-text-secondary font-semibold">
                    Metric
                  </th>
                  {comparedScenarios.map((s) => (
                    <th
                      key={s.id}
                      className="text-left px-4 py-3 text-xs text-text-primary font-semibold"
                    >
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: 'Source Field',
                    values: comparedScenarios.map((s) => s.source_field_name),
                  },
                  {
                    label: 'CO2 Content',
                    values: comparedScenarios.map((s) => formatCO2(s.co2_mol_pct)),
                    colors: comparedScenarios.map((s) => getCO2Color(s.co2_mol_pct)),
                  },
                  {
                    label: 'Flow Rate',
                    values: comparedScenarios.map((s) => formatFlow(s.gas_flow_rate_mscm_d)),
                  },
                  {
                    label: 'Strategy',
                    values: comparedScenarios.map((s) =>
                      s.config.strategy.replace(/_/g, ' ')
                    ),
                  },
                  {
                    label: 'Total Cost',
                    values: comparedScenarios.map((s) =>
                      formatCost(s.result?.existing_pathways[0]?.total_cost_musd_yr ?? 0)
                    ),
                    highlight: true,
                  },
                  {
                    label: 'Storage',
                    values: comparedScenarios.map((s) => s.config.storage_site),
                  },
                ].map((row, i) => {
                  const best = row.highlight
                    ? Math.min(
                        ...comparedScenarios.map(
                          (s) => s.result?.existing_pathways[0]?.total_cost_musd_yr ?? Infinity
                        )
                      )
                    : null;

                  return (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-2.5 text-text-secondary text-xs">
                        {row.label}
                      </td>
                      {row.values.map((v, j) => (
                        <td
                          key={j}
                          className={`px-4 py-2.5 text-xs font-medium ${
                            row.highlight &&
                            comparedScenarios[j].result?.existing_pathways[0]
                              ?.total_cost_musd_yr === best
                              ? 'text-success'
                              : ''
                          }`}
                          style={row.colors ? { color: row.colors[j] } : undefined}
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Decision support modules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PughMatrix scenarios={comparedScenarios} />
            <DecisionRadar scenarios={comparedScenarios} />
          </div>
          <WeightSliders />
        </>
      )}
    </div>
  );
}
