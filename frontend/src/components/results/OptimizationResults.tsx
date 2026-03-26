import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useScenarios } from '@/hooks/useScenario';
import { useScenarioStore } from '@/stores/scenarioStore';
import { RankingTable } from './RankingTable';
import { CostBreakdown } from './CostBreakdown';
import { PathwayDiagram } from './PathwayDiagram';
import { BridgeCard } from './BridgeCard';
import { MonteCarloChart } from '@/components/uncertainty/MonteCarloChart';
import { TornadoChart } from '@/components/uncertainty/TornadoChart';
import { RiskRegister } from '@/components/risk/RiskRegister';
import { formatCost } from '@/utils/formatters';
import { downloadReport } from '@/api/client';
import type { Pathway } from '@/types/scenario';

export function OptimizationResults() {
  const { activeScenario } = useScenarios();
  const setActiveTab = useScenarioStore((s) => s.setActiveTab);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [tab, setTab] = useState<'existing' | 'bridges'>('existing');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!activeScenario) return;
    setExporting(true);
    try {
      await downloadReport(activeScenario.id);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (!activeScenario?.result) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary text-sm">No optimization results</p>
          <p className="text-text-secondary/60 text-xs mt-1">
            Run an optimization from the Scenarios tab
          </p>
          <button
            onClick={() => setActiveTab('scenarios')}
            className="mt-3 px-4 py-2 bg-teal text-navy rounded-lg text-xs font-medium hover:bg-teal/90 transition-colors"
          >
            Go to Scenarios
          </button>
        </div>
      </div>
    );
  }

  const { existing_pathways, bridge_pathways, bridges } = activeScenario.result;
  const currentPathways = tab === 'existing' ? existing_pathways : bridge_pathways;
  const selectedPathway = currentPathways.find((p: Pathway) => p.rank === selectedRank);

  const existingBest = existing_pathways[0]?.total_cost_musd_yr ?? 0;
  const bridgeBest = bridge_pathways[0]?.total_cost_musd_yr ?? 0;
  const bridgeSavings = existingBest > 0 && bridgeBest > 0 ? existingBest - bridgeBest : 0;

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6">
      {/* Header with tab toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Optimization Results
            </h2>
            <p className="text-sm text-text-secondary">
              {activeScenario.name}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium text-text-secondary hover:border-teal/30 hover:text-teal transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>

        <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => { setTab('existing'); setSelectedRank(null); }}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              tab === 'existing'
                ? 'bg-teal text-navy'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Existing Infrastructure
          </button>
          <button
            onClick={() => { setTab('bridges'); setSelectedRank(null); }}
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
          <span className="text-xs text-text-secondary">
            {tab === 'bridges' ? 'Bridge Savings' : 'Bridge Opportunities'}
          </span>
          <p className={`text-lg font-semibold ${tab === 'bridges' && bridgeSavings > 0 ? 'text-success' : 'text-warning'}`}>
            {tab === 'bridges' && bridgeSavings > 0
              ? formatCost(bridgeSavings) + '/yr'
              : bridges.length.toString()
            }
          </p>
        </div>
      </div>

      {/* Ranking table */}
      {currentPathways.length > 0 && (
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
      )}

      {/* Selected pathway diagram */}
      {selectedPathway && <PathwayDiagram pathway={selectedPathway} />}

      {/* Cost breakdown */}
      {currentPathways.length > 0 && (
        <CostBreakdown pathways={currentPathways} />
      )}

      {/* Bridge opportunity cards */}
      {tab === 'bridges' && bridges.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Bridge Infrastructure Opportunities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bridges.map((b, i) => (
              <BridgeCard key={i} bridge={b} index={i} />
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
