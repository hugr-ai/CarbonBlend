import { useState } from 'react';
import { useScenarios } from '@/hooks/useScenario';
import { RankingTable } from './RankingTable';
import { CostBreakdown } from './CostBreakdown';
import { PathwayDiagram } from './PathwayDiagram';
import { MonteCarloChart } from '@/components/uncertainty/MonteCarloChart';
import { TornadoChart } from '@/components/uncertainty/TornadoChart';
import { RiskRegister } from '@/components/risk/RiskRegister';
import { formatCost } from '@/utils/formatters';
import type { Pathway } from '@/types/scenario';

export function OptimizationResults() {
  const { activeScenario } = useScenarios();
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [tab, setTab] = useState<'existing' | 'bridges'>('existing');

  if (!activeScenario?.result) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary text-sm">No optimization results</p>
          <p className="text-text-secondary/60 text-xs mt-1">
            Run an optimization from the Scenarios tab
          </p>
        </div>
      </div>
    );
  }

  const { existing_pathways, bridge_pathways, bridges } = activeScenario.result;
  const currentPathways = tab === 'existing' ? existing_pathways : bridge_pathways;
  const selectedPathway = currentPathways.find((p) => p.rank === selectedRank);

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Optimization Results
          </h2>
          <p className="text-sm text-text-secondary">
            {activeScenario.name}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setTab('existing')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === 'existing'
                ? 'bg-teal text-navy'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Existing Infrastructure
          </button>
          <button
            onClick={() => setTab('bridges')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === 'bridges'
                ? 'bg-teal text-navy'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            With Bridges ({bridges.length})
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-xl p-3">
          <span className="text-xs text-text-secondary">Best Cost</span>
          <p className="text-lg font-semibold text-teal">
            {formatCost(currentPathways[0]?.total_cost_musd_yr ?? 0)}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3">
          <span className="text-xs text-text-secondary">Pathways Found</span>
          <p className="text-lg font-semibold text-text-primary">
            {currentPathways.length}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3">
          <span className="text-xs text-text-secondary">CO2 Removed</span>
          <p className="text-lg font-semibold text-text-primary">
            {(currentPathways[0]?.co2_removed_mtpa ?? 0).toFixed(2)} MTPA
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3">
          <span className="text-xs text-text-secondary">Bridge Opportunities</span>
          <p className="text-lg font-semibold text-warning">
            {bridges.length}
          </p>
        </div>
      </div>

      {/* Ranking table */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Ranked Pathways
        </h3>
        <RankingTable
          pathways={currentPathways}
          selectedRank={selectedRank}
          onSelect={setSelectedRank}
        />
      </div>

      {/* Selected pathway diagram */}
      {selectedPathway && <PathwayDiagram pathway={selectedPathway} />}

      {/* Cost breakdown */}
      {currentPathways.length > 0 && (
        <CostBreakdown pathways={currentPathways} />
      )}

      {/* Bridge opportunities */}
      {tab === 'bridges' && bridges.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Bridge Opportunities
          </h3>
          <div className="space-y-2">
            {bridges.map((b, i) => (
              <div
                key={i}
                className="bg-navy border border-border rounded-lg p-3 flex items-start justify-between"
              >
                <div>
                  <span className="text-xs font-medium text-text-primary">
                    {b.type}
                  </span>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {b.description}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-text-primary">
                    CAPEX: {formatCost(b.capex_musd)}
                  </p>
                  <p className="text-xs text-success">
                    NPV: {formatCost(b.npv_musd)}
                  </p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      b.risk_rating === 'low'
                        ? 'bg-success/20 text-success'
                        : b.risk_rating === 'medium'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-danger/20 text-danger'
                    }`}
                  >
                    {b.risk_rating} risk
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uncertainty & Risk sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonteCarloChart scenarioId={activeScenario.id} />
        <TornadoChart scenarioId={activeScenario.id} />
      </div>
      <RiskRegister scenarioId={activeScenario.id} />
    </div>
  );
}
