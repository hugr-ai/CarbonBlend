import { useState } from 'react';
import { X } from 'lucide-react';
import type { FieldFiltersState } from '@/stores/scenarioStore';

interface FieldFiltersProps {
  filters: FieldFiltersState;
  onFiltersChange: (updates: Partial<FieldFiltersState>) => void;
  onReset: () => void;
}

const areas = ['North Sea', 'Norwegian Sea', 'Barents Sea'];
const statuses = ['Producing', 'Shut down', 'PDO Approved', 'Approved for production'];
const hcTypes = ['GAS', 'OIL', 'GAS/CONDENSATE', 'OIL/GAS'];
const operators = [
  'Equinor Energy AS',
  'Aker BP ASA',
  'ConocoPhillips Skandinavia AS',
  'Shell Offshore Norge AS',
  'TotalEnergies EP Norge AS',
  'Vår Energi ASA',
  'OKEA ASA',
  'Wintershall Dea Norge AS',
  'Neptune Energy Norge AS',
  'Harbour Energy Norge AS',
  'DNO Norge AS',
  'OMV (Norge) AS',
  'Repsol Norge AS',
  'Pandion Energy AS',
  'Sval Energi AS',
  'Petoro AS',
];

const selectClass =
  'w-full mt-0.5 px-2 py-1.5 bg-navy text-text-primary text-xs rounded-md border border-border focus:border-teal focus:outline-none';

export function FieldFilters({ filters, onFiltersChange, onReset }: FieldFiltersProps) {
  const [operatorSearch, setOperatorSearch] = useState('');
  const [showOperatorList, setShowOperatorList] = useState(false);

  const filteredOperators = operators.filter((op) =>
    op.toLowerCase().includes(operatorSearch.toLowerCase())
  );

  const activeCount = [
    filters.area,
    filters.status,
    filters.hc_type,
    filters.operator,
    filters.co2_min != null ? true : null,
    filters.co2_max != null ? true : null,
    filters.assetType !== 'fields' ? true : null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-2.5 px-3 py-2">
      {/* Asset Type Toggle */}
      <div>
        <label className="text-xs text-text-secondary">Asset Type</label>
        <div className="flex mt-0.5 rounded-md overflow-hidden border border-border">
          {(['fields', 'discoveries', 'all'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onFiltersChange({ assetType: type })}
              className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                filters.assetType === type
                  ? 'bg-teal text-navy'
                  : 'bg-navy text-text-secondary hover:text-text-primary'
              }`}
            >
              {type === 'fields' ? 'Fields' : type === 'discoveries' ? 'Discoveries' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Region */}
      <div>
        <label className="text-xs text-text-secondary">Region</label>
        <select
          value={filters.area ?? ''}
          onChange={(e) => onFiltersChange({ area: e.target.value || null })}
          className={selectClass}
        >
          <option value="">All Regions</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="text-xs text-text-secondary">Status</label>
        <select
          value={filters.status ?? ''}
          onChange={(e) => onFiltersChange({ status: e.target.value || null })}
          className={selectClass}
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* HC Type */}
      <div>
        <label className="text-xs text-text-secondary">HC Type</label>
        <select
          value={filters.hc_type ?? ''}
          onChange={(e) => onFiltersChange({ hc_type: e.target.value || null })}
          className={selectClass}
        >
          <option value="">All Types</option>
          {hcTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Operator (searchable dropdown) */}
      <div className="relative">
        <label className="text-xs text-text-secondary">Operator</label>
        <div className="relative mt-0.5">
          <input
            type="text"
            value={filters.operator ?? operatorSearch}
            onChange={(e) => {
              setOperatorSearch(e.target.value);
              setShowOperatorList(true);
              if (!e.target.value) onFiltersChange({ operator: null });
            }}
            onFocus={() => setShowOperatorList(true)}
            placeholder="Search operators..."
            className={selectClass}
          />
          {filters.operator && (
            <button
              onClick={() => {
                onFiltersChange({ operator: null });
                setOperatorSearch('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {showOperatorList && !filters.operator && (
          <div className="absolute z-20 w-full mt-0.5 max-h-32 overflow-y-auto bg-navy border border-border rounded-md shadow-lg">
            {filteredOperators.map((op) => (
              <button
                key={op}
                onClick={() => {
                  onFiltersChange({ operator: op });
                  setOperatorSearch('');
                  setShowOperatorList(false);
                }}
                className="w-full text-left px-2 py-1.5 text-xs text-text-primary hover:bg-teal-dim transition-colors"
              >
                {op}
              </button>
            ))}
            {filteredOperators.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-text-secondary">No matches</div>
            )}
          </div>
        )}
      </div>

      {/* CO2 Range Slider */}
      <div>
        <label className="text-xs text-text-secondary">CO2 Range (mol%)</label>
        <div className="flex items-center gap-2 mt-0.5">
          <input
            type="number"
            min={0}
            max={15}
            step={0.5}
            value={filters.co2_min ?? ''}
            onChange={(e) =>
              onFiltersChange({
                co2_min: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="Min"
            className="w-full px-2 py-1.5 bg-navy text-text-primary text-xs rounded-md border border-border focus:border-teal focus:outline-none"
          />
          <span className="text-text-secondary text-xs">-</span>
          <input
            type="number"
            min={0}
            max={15}
            step={0.5}
            value={filters.co2_max ?? ''}
            onChange={(e) =>
              onFiltersChange({
                co2_max: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="Max"
            className="w-full px-2 py-1.5 bg-navy text-text-primary text-xs rounded-md border border-border focus:border-teal focus:outline-none"
          />
        </div>
      </div>

      {/* Reset */}
      {activeCount > 0 && (
        <button
          onClick={onReset}
          className="w-full mt-1 px-2 py-1.5 text-xs text-text-secondary hover:text-danger border border-border rounded-md hover:border-danger/30 transition-colors"
        >
          Clear {activeCount} filter{activeCount !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
