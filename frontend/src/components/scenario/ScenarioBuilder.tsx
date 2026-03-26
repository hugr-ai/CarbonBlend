import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Save, Search, Loader2, Play, CheckCircle2 } from 'lucide-react';
import { useFields } from '@/hooks/useFields';
import { useCreateScenario } from '@/hooks/useScenario';
import { useOptimization } from '@/hooks/useOptimization';
import { useScenarioStore } from '@/stores/scenarioStore';
import { formatCO2, getCO2Color } from '@/utils/co2Calculations';
import { formatFlow, formatCost } from '@/utils/formatters';
import type { ScenarioConfig } from '@/types/scenario';

const strategies = [
  { value: 'full_removal' as const, label: 'Full CO2 Removal', desc: 'Remove all CO2 before export' },
  { value: 'partial_removal_blend' as const, label: 'Partial Removal + Blend', desc: 'Remove some, blend the rest' },
  { value: 'blend_only' as const, label: 'Blend Only', desc: 'Blend with low-CO2 gas streams' },
  { value: 'direct' as const, label: 'Direct Export', desc: 'Export without CO2 treatment' },
];

const terminals = [
  { id: 'st-fergus', name: 'St Fergus', country: 'UK' },
  { id: 'easington', name: 'Easington', country: 'UK' },
  { id: 'emden', name: 'Emden', country: 'Germany' },
  { id: 'dornum', name: 'Dornum', country: 'Germany' },
  { id: 'dunkerque', name: 'Dunkerque', country: 'France' },
  { id: 'zeebrugge', name: 'Zeebrugge', country: 'Belgium' },
];

const storageSites = ['Sleipner', 'Northern Lights', 'None'];

export function ScenarioBuilder() {
  const [step, setStep] = useState(0);
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedFieldNpdid, setSelectedFieldNpdid] = useState<number | null>(null);
  const [selectedFieldName, setSelectedFieldName] = useState('');
  const [co2MolPct, setCo2MolPct] = useState(3.0);
  const [flowRate, setFlowRate] = useState(20);
  const [strategy, setStrategy] = useState<ScenarioConfig['strategy']>('partial_removal_blend');
  const [targetTerminals, setTargetTerminals] = useState<string[]>([]);
  const [storageSite, setStorageSite] = useState('Northern Lights');
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioSaved, setScenarioSaved] = useState(false);

  const { data: fields } = useFields();
  const createScenario = useCreateScenario();
  const optimization = useOptimization();
  const setActiveTab = useScenarioStore((s) => s.setActiveTab);

  const filteredFields = useMemo(() => {
    if (!fields) return [];
    if (!fieldSearch) return fields.slice(0, 20);
    const q = fieldSearch.toLowerCase();
    return fields.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 20);
  }, [fields, fieldSearch]);

  const estimatedCost = useMemo(() => {
    let base = flowRate * 0.5;
    if (strategy === 'full_removal') base *= 1.8;
    else if (strategy === 'partial_removal_blend') base *= 1.3;
    else if (strategy === 'blend_only') base *= 0.9;
    base += targetTerminals.length * 2;
    if (storageSite !== 'None') base += co2MolPct * 5;
    return base;
  }, [flowRate, strategy, targetTerminals, storageSite, co2MolPct]);

  const buildConfig = useCallback((): ScenarioConfig => ({
    strategy,
    target_co2_mol_pct: 2.5,
    target_terminals: targetTerminals,
    storage_site: storageSite,
    hub_prices: {},
  }), [strategy, targetTerminals, storageSite]);

  const handleSave = () => {
    if (!selectedFieldNpdid) return;
    createScenario.mutate(
      {
        name: scenarioName || `${selectedFieldName} Scenario`,
        description: `${strategy} strategy for ${selectedFieldName}`,
        source_field_npdid: selectedFieldNpdid,
        source_field_name: selectedFieldName,
        gas_flow_rate_mscm_d: flowRate,
        co2_mol_pct: co2MolPct,
        config: buildConfig(),
      },
      {
        onSuccess: () => {
          setScenarioSaved(true);
        },
      }
    );
  };

  const handleRunOptimization = () => {
    if (!selectedFieldNpdid) return;
    optimization.run({
      ...buildConfig(),
      source_field_npdid: selectedFieldNpdid,
      gas_flow_rate_mscm_d: flowRate,
      co2_mol_pct: co2MolPct,
    });
  };

  const canNext = () => {
    if (step === 0) return selectedFieldNpdid !== null;
    if (step === 1) return flowRate > 0;
    if (step === 3) return targetTerminals.length > 0;
    return true;
  };

  const stepTitles = [
    'Select Source Field',
    'Flow Rate & CO2',
    'Strategy',
    'Target Markets',
    'CO2 Storage',
    'Review & Run',
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {stepTitles.map((title, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => setStep(i)}
                className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-colors ${
                  i === step
                    ? 'bg-teal text-navy'
                    : i < step
                    ? 'bg-teal/20 text-teal'
                    : 'bg-surface-light text-text-secondary'
                }`}
              >
                {i + 1}
              </button>
              {i < stepTitles.length - 1 && (
                <div
                  className={`flex-1 h-px ${
                    i < step ? 'bg-teal/40' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-text-primary mb-1">
          {stepTitles[step]}
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          {step === 0 && 'Choose the gas field to analyze'}
          {step === 1 && 'Set gas flow rate and CO2 content'}
          {step === 2 && 'Choose how to handle CO2'}
          {step === 3 && 'Select export destination terminals'}
          {step === 4 && 'Configure CO2 storage options'}
          {step === 5 && 'Review your scenario and run optimization'}
        </p>

        {/* Step 0: Select Field */}
        {step === 0 && (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search fields..."
                className="w-full pl-10 pr-4 py-2.5 bg-navy text-text-primary rounded-lg border border-border focus:border-teal focus:outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredFields.map((f) => (
                <button
                  key={f.npdid_field}
                  onClick={() => {
                    setSelectedFieldNpdid(f.npdid_field);
                    setSelectedFieldName(f.name);
                    if (f.co2_spec) setCo2MolPct(f.co2_spec.co2_mol_pct);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                    selectedFieldNpdid === f.npdid_field
                      ? 'bg-teal-dim border border-teal/30'
                      : 'hover:bg-teal-dim/50'
                  }`}
                >
                  <div>
                    <span className="text-sm text-text-primary">{f.name}</span>
                    <span className="text-xs text-text-secondary ml-2">
                      {f.main_area}
                    </span>
                  </div>
                  {f.co2_spec && (
                    <span
                      className="text-xs font-mono"
                      style={{ color: getCO2Color(f.co2_spec.co2_mol_pct) }}
                    >
                      {formatCO2(f.co2_spec.co2_mol_pct)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Flow Rate & CO2 */}
        {step === 1 && (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
            <div>
              <label className="text-sm text-text-secondary">
                Gas Flow Rate: <span className="font-mono text-teal">{formatFlow(flowRate)}</span>
              </label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={flowRate}
                  onChange={(e) => setFlowRate(Number(e.target.value))}
                  className="flex-1 accent-teal"
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={flowRate}
                  onChange={(e) => setFlowRate(Math.min(100, Math.max(1, Number(e.target.value))))}
                  className="w-20 px-2 py-1.5 bg-navy text-text-primary text-sm rounded-md border border-border focus:border-teal focus:outline-none text-center font-mono"
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                <span>1 MSm3/d</span>
                <span>100 MSm3/d</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-text-secondary">
                CO2 Content:{' '}
                <span className="font-mono" style={{ color: getCO2Color(co2MolPct) }}>
                  {formatCO2(co2MolPct)}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={15}
                step={0.1}
                value={co2MolPct}
                onChange={(e) => setCo2MolPct(Number(e.target.value))}
                className="w-full mt-2 accent-teal"
              />
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span>0%</span>
                <span className="text-warning">2.5% limit</span>
                <span>15%</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Strategy */}
        {step === 2 && (
          <div className="space-y-2">
            {strategies.map((s) => (
              <button
                key={s.value}
                onClick={() => setStrategy(s.value)}
                className={`w-full text-left bg-surface border rounded-xl p-4 transition-colors ${
                  strategy === s.value
                    ? 'border-teal/50 bg-teal-dim'
                    : 'border-border hover:border-teal/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      strategy === s.value
                        ? 'border-teal'
                        : 'border-text-secondary'
                    }`}
                  >
                    {strategy === s.value && (
                      <div className="w-2 h-2 rounded-full bg-teal" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-text-primary">
                      {s.label}
                    </span>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Target Markets */}
        {step === 3 && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="grid grid-cols-2 gap-2">
              {terminals.map((t) => {
                const checked = targetTerminals.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      setTargetTerminals((prev) =>
                        checked
                          ? prev.filter((x) => x !== t.id)
                          : [...prev, t.id]
                      )
                    }
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      checked
                        ? 'bg-teal-dim border border-teal/30'
                        : 'bg-navy border border-border hover:border-teal/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        checked ? 'bg-teal border-teal' : 'border-text-secondary'
                      }`}
                    >
                      {checked && (
                        <svg className="w-3 h-3 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="text-left">
                      <span className="text-sm text-text-primary">{t.name}</span>
                      <span className="text-xs text-text-secondary ml-1">
                        ({t.country})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Storage */}
        {step === 4 && (
          <div className="space-y-2">
            {storageSites.map((site) => (
              <button
                key={site}
                onClick={() => setStorageSite(site)}
                className={`w-full text-left bg-surface border rounded-xl p-4 transition-colors ${
                  storageSite === site
                    ? 'border-teal/50 bg-teal-dim'
                    : 'border-border hover:border-teal/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      storageSite === site ? 'border-teal' : 'border-text-secondary'
                    }`}
                  >
                    {storageSite === site && (
                      <div className="w-2 h-2 rounded-full bg-teal" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {site}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 5: Review & Run */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
              <div>
                <label className="text-xs text-text-secondary">Scenario Name</label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder={`${selectedFieldName} Scenario`}
                  className="w-full mt-1 px-3 py-2 bg-navy text-text-primary rounded-lg border border-border focus:border-teal focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-navy rounded-lg p-3">
                  <span className="text-text-secondary text-xs">Source Field</span>
                  <p className="font-medium text-text-primary">{selectedFieldName || 'Not selected'}</p>
                </div>
                <div className="bg-navy rounded-lg p-3">
                  <span className="text-text-secondary text-xs">Flow Rate</span>
                  <p className="font-medium text-text-primary">{formatFlow(flowRate)}</p>
                </div>
                <div className="bg-navy rounded-lg p-3">
                  <span className="text-text-secondary text-xs">CO2 Content</span>
                  <p className="font-medium" style={{ color: getCO2Color(co2MolPct) }}>
                    {formatCO2(co2MolPct)}
                  </p>
                </div>
                <div className="bg-navy rounded-lg p-3">
                  <span className="text-text-secondary text-xs">Strategy</span>
                  <p className="font-medium text-text-primary">
                    {strategies.find((s) => s.value === strategy)?.label}
                  </p>
                </div>
                <div className="bg-navy rounded-lg p-3">
                  <span className="text-text-secondary text-xs">Terminals</span>
                  <p className="font-medium text-text-primary">
                    {targetTerminals.length > 0
                      ? targetTerminals
                          .map((id) => terminals.find((t) => t.id === id)?.name)
                          .join(', ')
                      : 'None'}
                  </p>
                </div>
                <div className="bg-navy rounded-lg p-3">
                  <span className="text-text-secondary text-xs">Storage</span>
                  <p className="font-medium text-text-primary">{storageSite}</p>
                </div>
              </div>
              <div className="bg-teal-dim border border-teal/20 rounded-lg p-3">
                <span className="text-xs text-text-secondary">Estimated Annual Cost</span>
                <p className="text-lg font-semibold text-teal">
                  {formatCost(estimatedCost)}
                </p>
              </div>
            </div>

            {/* Optimization Results */}
            {optimization.status === 'complete' && optimization.result && (
              <div className="bg-surface border border-teal/30 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-teal flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Optimization Results
                </h3>
                <p className="text-xs text-text-secondary">
                  Found {optimization.result.existing_pathways?.length ?? 0} viable pathways
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(optimization.result.existing_pathways ?? []).slice(0, 5).map((pathway, idx) => (
                    <div
                      key={idx}
                      className="bg-navy rounded-lg p-3 border border-border"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-text-primary">
                          #{idx + 1} {pathway.terminal ?? pathway.name}
                        </span>
                        <span className="text-xs font-semibold text-teal">
                          {formatCost(pathway.total_cost_musd_yr)}/yr
                        </span>
                      </div>
                      {pathway.steps && pathway.steps.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pathway.steps.map((s, si) => (
                            <span
                              key={si}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-surface-light text-text-secondary"
                            >
                              {s.location}: {formatCO2(s.co2_in)} -&gt; {formatCO2(s.co2_out)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {optimization.status === 'failed' && (
              <div className="bg-surface border border-danger/30 rounded-xl p-4">
                <p className="text-xs text-danger">
                  Optimization failed: {optimization.error}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          {step < 5 ? (
            <button
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              disabled={!canNext()}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal text-navy rounded-lg text-sm font-medium hover:bg-teal/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleRunOptimization}
                disabled={!selectedFieldNpdid || optimization.status === 'running' || optimization.status === 'pending'}
                className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-teal/40 text-teal rounded-lg text-sm font-medium hover:bg-teal-dim disabled:opacity-40 transition-colors"
              >
                {optimization.status === 'running' || optimization.status === 'pending' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run Optimization
              </button>
              <button
                onClick={handleSave}
                disabled={createScenario.isPending || scenarioSaved}
                className="flex items-center gap-1.5 px-5 py-2 bg-teal text-navy rounded-lg text-sm font-semibold hover:bg-teal/90 disabled:opacity-50 transition-colors"
              >
                {createScenario.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : scenarioSaved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {scenarioSaved ? 'Saved' : 'Save Scenario'}
              </button>
            </div>
          )}
        </div>

        {/* Link to view saved scenarios */}
        {scenarioSaved && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setActiveTab('scenarios')}
              className="text-sm text-teal hover:underline"
            >
              View saved scenarios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
