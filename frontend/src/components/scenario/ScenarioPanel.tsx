import { useState } from 'react';
import { Play, Trash2, ChevronDown, ChevronUp, Loader2, Route, FileSpreadsheet } from 'lucide-react';
import { useScenarios, useDeleteScenario } from '@/hooks/useScenario';
import { useOptimization } from '@/hooks/useOptimization';
import { useScenarioStore } from '@/stores/scenarioStore';
import { formatCO2, getCO2Color } from '@/utils/co2Calculations';
import { formatCost, formatFlow } from '@/utils/formatters';
import { downloadReport } from '@/api/client';

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
        const optResult = scenario.result;

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
                {optResult && (
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

                {/* Optimization Results */}
                {optResult && optResult.existing_pathways && optResult.existing_pathways.length > 0 && (
                  <div className="space-y-2">
                    <div className="bg-teal-dim border border-teal/20 rounded-lg p-3">
                      <span className="text-xs text-text-secondary">Best Pathway Cost</span>
                      <p className="text-lg font-semibold text-teal">
                        {formatCost(
                          optResult.existing_pathways[0]?.total_cost_musd_yr ?? 0
                        )}
                        <span className="text-xs font-normal text-text-secondary">/yr</span>
                      </p>
                    </div>

                    <div className="text-xs text-text-secondary flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      {optResult.existing_pathways.length} pathway
                      {optResult.existing_pathways.length !== 1 ? 's' : ''} found
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {optResult.existing_pathways.slice(0, 3).map((pathway, idx) => (
                        <div key={idx} className="bg-navy rounded-lg p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-text-primary font-medium">
                              #{idx + 1} {pathway.terminal ?? pathway.name}
                            </span>
                            <span className="text-teal font-mono">
                              {formatCost(pathway.total_cost_musd_yr)}/yr
                            </span>
                          </div>
                          {pathway.steps && pathway.steps.length > 0 && (
                            <div className="mt-1 text-text-secondary">
                              {pathway.steps.map((s) => s.location).join(' > ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline optimization status for active scenario */}
                {isActive && optimization.status === 'running' && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal" />
                    Running optimization...
                  </div>
                )}
                {isActive && optimization.status === 'failed' && (
                  <div className="text-xs text-danger bg-danger/10 rounded-lg p-2">
                    {optimization.error}
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
                    onClick={() => downloadReport(scenario.id).catch(console.error)}
                    className="px-3 py-2 rounded-lg text-text-secondary hover:bg-teal/10 hover:text-teal transition-colors"
                    title="Export Report"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
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
