import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useFields } from '@/hooks/useFields';
import { useScenarioStore } from '@/stores/scenarioStore';
import { FieldCard } from './FieldCard';
import { FieldFilters } from './FieldFilters';
import type { FieldParams } from '@/api/client';

export function FieldSelector() {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FieldParams>({});

  const selectedFieldNpdid = useScenarioStore((s) => s.selectedFieldNpdid);
  const setSelectedField = useScenarioStore((s) => s.setSelectedField);

  const { data: fields, isLoading, error } = useFields(filters);

  const filtered = useMemo(() => {
    if (!fields) return [];
    if (!search) return fields;
    const q = search.toLowerCase();
    return fields.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.operator ?? '').toLowerCase().includes(q)
    );
  }, [fields, search]);

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fields..."
            className="w-full pl-8 pr-3 py-2 bg-navy text-text-primary text-sm rounded-lg border border-border focus:border-teal focus:outline-none placeholder:text-text-secondary/50"
          />
        </div>
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-teal transition-colors"
      >
        <Filter className="w-3 h-3" />
        Filters
        {showFilters ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {showFilters && <FieldFilters filters={filters} onFiltersChange={setFilters} />}

      {/* Field list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-teal animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-6 text-xs text-danger">
            Failed to load fields
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-6 text-xs text-text-secondary">
            No fields found
          </div>
        )}

        {filtered.map((field) => (
          <FieldCard
            key={field.npdid_field}
            field={field}
            isSelected={selectedFieldNpdid === field.npdid_field}
            onClick={() =>
              setSelectedField(
                selectedFieldNpdid === field.npdid_field
                  ? null
                  : field.npdid_field
              )
            }
          />
        ))}

        {!isLoading && filtered.length > 0 && (
          <div className="text-center py-2 text-[10px] text-text-secondary">
            {filtered.length} field{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
