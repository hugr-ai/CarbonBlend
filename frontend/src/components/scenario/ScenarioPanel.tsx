import { useState } from 'react';
import { Play, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useScenarios, useDeleteScenario } from '@/hooks/useScenario';
import { useOptimization } from '@/hooks/useOptimization';
import { useScenarioStore } from '@/stores/scenarioStore';
import { formatCO2, getCO2Color } from '@/utils/co2Calculations';
import { formatCost, formatFlow } from '@/utils/formatters';

export function ScenarioPanel() {
  const { scenarios, activeScenario } = useScenarios();
  const deleteScenario = useDeleteScenario();
  const optimization = useOptimization();
  const { setActive, activeScenarioId } = useScenarioStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleOptimize = () => {
    if (!activeScenario) return;
    optimization.run({
      ...activeScenario.config,
      source_field_npdid: activeScenario.source_field_npdid,
      gas_flow_rate_mscm_d: activeScenario.gas_flow_rate_mscm_d,
      co2_mol_pct: activeScenario.co2_mol_pct,
    });
  };

  if (scenarios.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary text-sm">No scenarios created yet</p>
          <p className="text-text-secondary/60 text-xs mt-1">
            Use the builder to create your first scenario
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 space-y-3">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
        Scenarios ({scenarios.length})
      </h2>

      {scenarios.map((scenario) => {
        const isActive = scenario.id === activeScenarioId;
        const isExpanded = expanded === scenario.id;

        return (
          <div
            key={scenario.id}
            className={`bg-surface border rounded-xl transition-colors ${
              isActive ? 'border-teal/40' : 'border-border'
            }`}
          >
            <button
              onClick={() => {
                setActive(isActive ? null : scenario.id);
                setExpanded(isExpanded ? null : scenario.id);
              }}
              className="w-full text-left px-4 py-3 flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-medium text-text-primary">
                  {scenario.name}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {scenario.source_field_name} &bull;{' '}
                  <span style={{ color: getCO2Color(scenario.co2_mol_pct) }}>
                    {formatCO2(scenario.co2_mol_pct)}
                  </span>{' '}
                  &bull; {formatFlow(scenario.gas_flow_rate_mscm_d)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {scenario.result && (
                  <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                    Optimized
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-secondary" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-navy rounded-lg p-2">
                    <span className="text-text-secondary">Strategy</span>
                    <p className="text-text-primary capitalize">
                      {scenario.config.strategy.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="bg-navy rounded-lg p-2">
                    <span className="text-text-secondary">Storage</span>
                    <p className="text-text-primary">{scenario.config.storage_site}</p>
                  </div>
                  <div className="bg-navy rounded-lg p-2 col-span-2">
                    <span className="text-text-secondary">Terminals</span>
                    <p className="text-text-primary">
                      {scenario.config.target_terminals.join(', ') || 'None'}
                    </p>
                  </div>
                </div>

                {scenario.result && (
                  <div className="bg-teal-dim border border-teal/20 rounded-lg p-3">
                    <span className="text-xs text-text-secondary">Best Pathway Cost</span>
                    <p className="text-lg font-semibold text-teal">
                      {formatCost(
                        scenario.result.existing_pathways[0]?.total_cost_musd_yr ?? 0
                      )}
                      <span className="text-xs font-normal text-text-secondary">/yr</span>
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleOptimize}
                    disabled={!isActive || optimization.status === 'running'}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal text-navy rounded-lg text-xs font-medium hover:bg-teal/90 disabled:opacity-40 transition-colors"
                  >
                    {optimization.status === 'running' && isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Run Optimization
                  </button>
                  <button
                    onClick={() => deleteScenario.mutate(scenario.id)}
                    className="px-3 py-2 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
