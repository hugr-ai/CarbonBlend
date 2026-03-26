import type { Field } from '@/types/field';
import { getCO2Color, formatCO2 } from '@/utils/co2Calculations';

interface FieldCardProps {
  field: Field;
  isSelected: boolean;
  onClick: () => void;
}

const areaBadgeColors: Record<string, string> = {
  'North sea': 'bg-blue-900/50 text-blue-300',
  'North Sea': 'bg-blue-900/50 text-blue-300',
  'Norwegian sea': 'bg-purple-900/50 text-purple-300',
  'Norwegian Sea': 'bg-purple-900/50 text-purple-300',
  'Barents sea': 'bg-cyan-900/50 text-cyan-300',
  'Barents Sea': 'bg-cyan-900/50 text-cyan-300',
};

export function FieldCard({ field, isSelected, onClick }: FieldCardProps) {
  const co2Color = field.co2_mol_pct != null
    ? getCO2Color(field.co2_mol_pct)
    : '#555';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
        isSelected
          ? 'bg-teal-dim border border-teal/30'
          : 'hover:bg-teal-dim/50 border border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: co2Color }}
            />
            <span className="text-sm font-medium text-text-primary truncate">
              {field.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                (field.main_area ? areaBadgeColors[field.main_area] : null) ?? 'bg-gray-800 text-gray-400'
              }`}
            >
              {field.main_area}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-navy-light text-text-secondary">
              {field.status}
            </span>
          </div>
        </div>
        <span className="text-xs font-mono shrink-0" style={{ color: co2Color }}>
          {field.co2_mol_pct != null ? formatCO2(field.co2_mol_pct) : '--'}
        </span>
      </div>
    </button>
  );
}
