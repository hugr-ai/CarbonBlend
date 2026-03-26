import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatCost } from '@/utils/formatters';
import { formatCO2 } from '@/utils/co2Calculations';
import type { Pathway } from '@/types/scenario';

interface RankingTableProps {
  pathways: Pathway[];
  selectedRank: number | null;
  onSelect: (rank: number) => void;
}

type SortKey = 'rank' | 'total_cost_musd_yr' | 'co2_removed_mtpa' | 'terminal';
type SortDir = 'asc' | 'desc';

export function RankingTable({ pathways, selectedRank, onSelect }: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...pathways].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'rank') return (a.rank - b.rank) * mul;
    if (sortKey === 'total_cost_musd_yr')
      return (a.total_cost_musd_yr - b.total_cost_musd_yr) * mul;
    if (sortKey === 'co2_removed_mtpa')
      return (a.co2_removed_mtpa - b.co2_removed_mtpa) * mul;
    if (sortKey === 'terminal')
      return a.terminal.localeCompare(b.terminal) * mul;
    return 0;
  });

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'asc' ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )
    ) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {(
              [
                ['rank', '#'],
                ['total_cost_musd_yr', 'Pathway'],
                ['total_cost_musd_yr', 'Cost (MUSD/yr)'],
                ['co2_removed_mtpa', 'CO2 Removed'],
                ['terminal', 'Terminal'],
              ] as [SortKey, string][]
            ).map(([key, label], i) => (
              <th
                key={i}
                onClick={() => handleSort(key)}
                className="text-left px-3 py-2 text-text-secondary font-semibold cursor-pointer hover:text-teal transition-colors"
              >
                <span className="flex items-center gap-1">
                  {label}
                  <SortIcon col={key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.rank}
              onClick={() => onSelect(p.rank)}
              className={`border-b border-border/30 cursor-pointer transition-colors ${
                selectedRank === p.rank
                  ? 'bg-teal-dim'
                  : 'hover:bg-teal-dim/30'
              }`}
            >
              <td className="px-3 py-2 text-text-secondary font-mono">
                {p.rank}
              </td>
              <td className="px-3 py-2 text-text-primary font-medium">
                {p.name}
              </td>
              <td className="px-3 py-2 text-teal font-mono">
                {formatCost(p.total_cost_musd_yr)}
              </td>
              <td className="px-3 py-2 text-text-primary font-mono">
                {p.co2_removed_mtpa.toFixed(2)} MTPA
              </td>
              <td className="px-3 py-2 text-text-primary">
                {p.terminal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
