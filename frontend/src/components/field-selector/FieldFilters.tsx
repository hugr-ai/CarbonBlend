import type { FieldParams } from '@/api/client';

interface FieldFiltersProps {
  filters: FieldParams;
  onFiltersChange: (filters: FieldParams) => void;
}

const areas = ['North Sea', 'Norwegian Sea', 'Barents Sea'];
const statuses = ['PRODUCING', 'SHUT DOWN', 'PDO APPROVED', 'DECIDED'];
const hcTypes = ['GAS', 'OIL', 'OIL/GAS', 'GAS/CONDENSATE'];

export function FieldFilters({ filters, onFiltersChange }: FieldFiltersProps) {
  const update = (key: keyof FieldParams, value: string | number | undefined) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  return (
    <div className="space-y-2 px-3 py-2">
      <div>
        <label className="text-xs text-text-secondary">Area</label>
        <select
          value={filters.main_area ?? ''}
          onChange={(e) => update('main_area', e.target.value)}
          className="w-full mt-0.5 px-2 py-1.5 bg-navy text-text-primary text-xs rounded-md border border-border focus:border-teal focus:outline-none"
        >
          <option value="">All Areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-text-secondary">Status</label>
        <select
          value={filters.status ?? ''}
          onChange={(e) => update('status', e.target.value)}
          className="w-full mt-0.5 px-2 py-1.5 bg-navy text-text-primary text-xs rounded-md border border-border focus:border-teal focus:outline-none"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-text-secondary">HC Type</label>
        <select
          value={filters.hc_type ?? ''}
          onChange={(e) => update('hc_type', e.target.value)}
          className="w-full mt-0.5 px-2 py-1.5 bg-navy text-text-primary text-xs rounded-md border border-border focus:border-teal focus:outline-none"
        >
          <option value="">All Types</option>
          {hcTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-text-secondary">CO2 Range (mol%)</label>
        <div className="flex items-center gap-2 mt-0.5">
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={filters.co2_min ?? ''}
            onChange={(e) =>
              update('co2_min', e.target.value ? parseFloat(e.target.value) : undefined)
            }
            placeholder="Min"
            className="w-full px-2 py-1.5 bg-navy text-text-primary text-xs rounded-md border border-border focus:border-teal focus:outline-none"
          />
          <span className="text-text-secondary text-xs">-</span>
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={filters.co2_max ?? ''}
            onChange={(e) =>
              update('co2_max', e.target.value ? parseFloat(e.target.value) : undefined)
            }
            placeholder="Max"
            className="w-full px-2 py-1.5 bg-navy text-text-primary text-xs rounded-md border border-border focus:border-teal focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
