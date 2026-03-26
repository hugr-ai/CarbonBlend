import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, GitCompare, Zap } from 'lucide-react';
import { FieldSelector } from '@/components/field-selector/FieldSelector';
import { useScenarioStore } from '@/stores/scenarioStore';
import { useField } from '@/hooks/useFields';
import { formatCO2, getCO2Color } from '@/utils/co2Calculations';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const selectedFieldNpdid = useScenarioStore((s) => s.selectedFieldNpdid);
  const setActiveTab = useScenarioStore((s) => s.setActiveTab);
  const { data: selectedField } = useField(selectedFieldNpdid);

  if (collapsed) {
    return (
      <div className="w-10 bg-surface border-r border-border flex flex-col items-center pt-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:bg-teal-dim text-text-secondary hover:text-teal transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-[280px] bg-surface border-r border-border flex flex-col shrink-0 overflow-hidden">
      {/* Collapse button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Explorer
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-teal-dim text-text-secondary hover:text-teal transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Field selector */}
      <div className="flex-1 overflow-y-auto">
        <FieldSelector />
      </div>

      {/* Selected field info */}
      {selectedField && (
        <div className="border-t border-border p-3 space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">
            {selectedField.name}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-text-secondary">Area</span>
              <p className="text-text-primary">{selectedField.main_area}</p>
            </div>
            <div>
              <span className="text-text-secondary">Status</span>
              <p className="text-text-primary">{selectedField.status}</p>
            </div>
            <div>
              <span className="text-text-secondary">Operator</span>
              <p className="text-text-primary truncate">{selectedField.operator}</p>
            </div>
            <div>
              <span className="text-text-secondary">CO2</span>
              <p
                className="font-medium"
                style={{
                  color: selectedField.co2_spec
                    ? getCO2Color(selectedField.co2_spec.co2_mol_pct)
                    : undefined,
                }}
              >
                {selectedField.co2_spec
                  ? formatCO2(selectedField.co2_spec.co2_mol_pct)
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="border-t border-border p-3 space-y-2">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Quick Actions
        </span>
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('scenarios')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-teal-dim hover:text-teal transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Scenario
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-teal-dim hover:text-teal transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            Compare
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-teal-dim hover:text-teal transition-colors"
          >
            <Zap className="w-4 h-4" />
            Optimize
          </button>
        </div>
      </div>
    </aside>
  );
}
