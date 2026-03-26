import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useScenarioStore } from '@/stores/scenarioStore';
import { formatCost, formatFlow } from '@/utils/formatters';
import { formatCO2, getCO2Color } from '@/utils/co2Calculations';
import { compareDecisions } from '@/api/client';
import { PughMatrix } from '@/components/decision/PughMatrix';
import { RadarChart as DecisionRadar } from '@/components/decision/RadarChart';
import { WeightSliders } from '@/components/decision/WeightSliders';
import { TariffCalculator } from '@/components/markets/TariffCalculator';
import { MarketPanel } from '@/components/markets/MarketPanel';
import { Crown, Star, TrendingUp } from 'lucide-react';
import type { DecisionComparison } from '@/types/scenario';

export function ScenarioComparison() {
  const scenarios = useScenarioStore((s) => s.scenarios);
  const comparisonIds = useScenarioStore((s) => s.comparisonIds);
  const addToComparison = useScenarioStore((s) => s.addToComparison);
  const removeFromComparison = useScenarioStore((s) => s.removeFromComparison);

  const [weights, setWeights] = useState<Record<string, number>>({
    Economics: 0.3,
    Technical: 0.25,
    Risk: 0.25,
    Strategic: 0.2,
  });

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

  // MCDA comparison query
  const comparisonPayload = useMemo(() => {
    if (comparedScenarios.length < 2) return null;
    return {
      scenarios: comparedScenarios.map((s) => s.id),
      weights,
    };
  }, [comparedScenarios, weights]);

  const { data: mcdaResult } = useQuery<DecisionComparison>({
    queryKey: ['decision-compare', comparisonPayload],
    queryFn: () => compareDecisions(
      comparedScenarios.map((s) => s.id),
      weights
    ),
    enabled: comparedScenarios.length >= 2,
    staleTime: 30000,
  });

  // Determine Pareto-optimal scenarios (simple local analysis)
  const paretoOptimal = useMemo(() => {
    if (comparedScenarios.length < 2) return new Set<string>();
    const optimal = new Set<string>();

    for (let i = 0; i < comparedScenarios.length; i++) {
      const s1 = comparedScenarios[i];
      const cost1 = s1.result?.existing_pathways[0]?.total_cost_musd_yr ?? Infinity;
      const co2_1 = s1.result?.existing_pathways[0]?.co2_removed_mtpa ?? 0;

      let isDominated = false;
      for (let j = 0; j < comparedScenarios.length; j++) {
        if (i === j) continue;
        const s2 = comparedScenarios[j];
        const cost2 = s2.result?.existing_pathways[0]?.total_cost_musd_yr ?? Infinity;
        const co2_2 = s2.result?.existing_pathways[0]?.co2_removed_mtpa ?? 0;

        // s2 dominates s1 if better or equal on all criteria and strictly better on at least one
        if (cost2 <= cost1 && co2_2 >= co2_1 && (cost2 < cost1 || co2_2 > co2_1)) {
          isDominated = true;
          break;
        }
      }
      if (!isDominated) {
        optimal.add(s1.id);
      }
    }
    return optimal;
  }, [comparedScenarios]);

  // Compute simple weighted rankings locally
  const rankings = useMemo(() => {
    if (comparedScenarios.length < 2) return [];

    // Compute scores based on weights
    const scored = comparedScenarios.map((s) => {
      const cost = s.result?.existing_pathways[0]?.total_cost_musd_yr ?? 100;
      const co2 = s.co2_mol_pct;

      // Economics: lower cost is better (scale 0-100)
      const maxCost = Math.max(...comparedScenarios.map((sc) => sc.result?.existing_pathways[0]?.total_cost_musd_yr ?? 100));
      const econScore = maxCost > 0 ? Math.max(0, (1 - cost / maxCost)) * 100 : 50;

      // Technical: lower CO2 is better compliance
      const techScore = co2 <= 2.5 ? 90 : co2 <= 5 ? 60 : 30;

      // Risk
      let riskScore = 50;
      if (s.config.strategy === 'direct') riskScore = 80;
      if (s.config.strategy === 'full_removal') riskScore = 30;
      if (s.config.storage_site !== 'None') riskScore += 10;
      riskScore = Math.min(100, riskScore);

      // Strategic
      const stratScore = Math.min(100, 30 + s.config.target_terminals.length * 15 + s.gas_flow_rate_mscm_d);

      const total =
        econScore * (weights.Economics ?? 0.3) +
        techScore * (weights.Technical ?? 0.25) +
        riskScore * (weights.Risk ?? 0.25) +
        stratScore * (weights.Strategic ?? 0.2);

      return { id: s.id, name: s.name, score: total, isPareto: paretoOptimal.has(s.id) };
    });

    return scored.sort((a, b) => b.score - a.score);
  }, [comparedScenarios, weights, paretoOptimal]);

  const handleWeightsChange = useCallback((normalized: Record<string, number>) => {
    setWeights(normalized);
  }, []);

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
          const isPareto = paretoOptimal.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() =>
                selected ? removeFromComparison(s.id) : addToComparison(s.id)
              }
              disabled={!selected && comparisonIds.length >= 4}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                selected
                  ? 'bg-teal text-navy'
                  : 'bg-surface border border-border text-text-secondary hover:border-teal/30 disabled:opacity-30'
              }`}
            >
              {s.name}
              {selected && isPareto && (
                <Star className="w-3 h-3 inline-block ml-1 fill-current" />
              )}
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
          {/* Ranking banner */}
          {rankings.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-teal" />
                <h3 className="text-sm font-semibold text-text-primary">
                  MCDA Ranking
                </h3>
              </div>
              <div className="flex gap-3">
                {rankings.map((r, idx) => (
                  <div
                    key={r.id}
                    className={`flex-1 rounded-lg p-3 border ${
                      idx === 0
                        ? 'border-teal bg-teal/5'
                        : 'border-border bg-navy'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${idx === 0 ? 'text-teal' : 'text-text-secondary'}`}>
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-medium text-text-primary">{r.name}</span>
                      {r.isPareto && (
                        <span className="text-[9px] bg-success/20 text-success px-1 py-0.5 rounded-full">
                          Pareto
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-mono font-semibold text-text-primary">
                      {r.score.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-text-secondary">weighted score</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                      <span className="flex items-center gap-1">
                        {s.name}
                        {paretoOptimal.has(s.id) && (
                          <TrendingUp className="w-3 h-3 text-success" />
                        )}
                      </span>
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
                    label: 'Pathways Found',
                    values: comparedScenarios.map((s) =>
                      String(s.result?.existing_pathways.length ?? 0)
                    ),
                  },
                  {
                    label: 'Bridge Opportunities',
                    values: comparedScenarios.map((s) =>
                      String(s.result?.bridges.length ?? 0)
                    ),
                  },
                  {
                    label: 'Storage',
                    values: comparedScenarios.map((s) => s.config.storage_site),
                  },
                  {
                    label: 'Dominance',
                    values: comparedScenarios.map((s) =>
                      paretoOptimal.has(s.id) ? 'Pareto Optimal' : 'Dominated'
                    ),
                    dominance: true,
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
                              : row.dominance
                              ? v === 'Pareto Optimal'
                                ? 'text-success'
                                : 'text-text-secondary'
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
          <WeightSliders onChange={handleWeightsChange} />
        </>
      )}

      {/* Tariff Calculator & Markets section */}
      <div className="pt-4 border-t border-border space-y-6">
        <TariffCalculator />
        <MarketPanel />
      </div>
    </div>
  );
}
