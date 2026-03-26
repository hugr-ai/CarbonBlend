import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Route, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { getPathsToTerminals, type PathToTerminal } from '@/api/client';
import { formatCO2, getCO2Color } from '@/utils/co2Calculations';

interface PathsToMarketProps {
  fieldNpdid: number;
  onHighlightPath: (nodeIds: string[] | null) => void;
  highlightedPath: string[] | null;
}

export function PathsToMarket({
  fieldNpdid,
  onHighlightPath,
  highlightedPath,
}: PathsToMarketProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: paths, isLoading, error } = useQuery({
    queryKey: ['paths-to-terminals', fieldNpdid],
    queryFn: () => getPathsToTerminals(fieldNpdid),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div
        className="absolute top-3 right-3 z-10 w-80 rounded-xl p-3"
        style={{
          background: 'rgba(10, 22, 40, 0.95)',
          border: '1px solid rgba(0, 212, 170, 0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin text-teal" />
          Finding paths to market...
        </div>
      </div>
    );
  }

  if (error || !paths) return null;

  if (paths.length === 0) {
    return (
      <div
        className="absolute top-3 right-3 z-10 w-80 rounded-xl p-3"
        style={{
          background: 'rgba(10, 22, 40, 0.95)',
          border: '1px solid rgba(0, 212, 170, 0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Route className="w-4 h-4" />
          No paths to export terminals found
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute top-3 right-3 z-10 w-80 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(10, 22, 40, 0.95)',
        border: '1px solid rgba(0, 212, 170, 0.2)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-teal" />
          <span className="text-sm font-medium text-text-primary">
            Paths to Market
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal/20 text-teal font-semibold">
            {paths.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="max-h-[400px] overflow-y-auto px-2 pb-2 space-y-1.5">
          {/* Clear highlight button */}
          {highlightedPath && (
            <button
              onClick={() => onHighlightPath(null)}
              className="w-full flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-text-secondary hover:text-text-primary rounded-md bg-white/5 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear path highlight
            </button>
          )}

          {paths.map((path, idx) => (
            <PathCard
              key={idx}
              path={path}
              rank={idx + 1}
              isHighlighted={
                highlightedPath !== null &&
                JSON.stringify(highlightedPath) === JSON.stringify(path.node_ids)
              }
              onClick={() => {
                if (
                  highlightedPath &&
                  JSON.stringify(highlightedPath) === JSON.stringify(path.node_ids)
                ) {
                  onHighlightPath(null);
                } else {
                  onHighlightPath(path.node_ids);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PathCard({
  path,
  rank,
  isHighlighted,
  onClick,
}: {
  path: PathToTerminal;
  rank: number;
  isHighlighted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-2.5 transition-all ${
        isHighlighted
          ? 'bg-teal/15 border border-teal/40'
          : 'bg-white/5 border border-transparent hover:border-teal/20 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-teal bg-teal/20 w-5 h-5 rounded-full flex items-center justify-center">
            {rank}
          </span>
          <span className="text-xs font-medium text-text-primary">
            {path.terminal_name}
          </span>
        </div>
        <span className="text-[10px] text-text-secondary">
          {path.path_length} hop{path.path_length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="bg-navy/60 rounded px-1.5 py-1">
          <span className="text-text-secondary block">Tariff</span>
          <span className="text-text-primary font-mono">
            {path.total_tariff_nok_sm3 > 0
              ? `${path.total_tariff_nok_sm3.toFixed(4)}`
              : 'N/A'}
          </span>
          <span className="text-text-secondary"> NOK/Sm3</span>
        </div>
        <div className="bg-navy/60 rounded px-1.5 py-1">
          <span className="text-text-secondary block">CO2 In</span>
          <span
            className="font-mono"
            style={{ color: path.co2_at_entry ? getCO2Color(path.co2_at_entry) : undefined }}
          >
            {path.co2_at_entry != null ? formatCO2(path.co2_at_entry) : 'N/A'}
          </span>
        </div>
        <div className="bg-navy/60 rounded px-1.5 py-1">
          <span className="text-text-secondary block">CO2 Out</span>
          <span
            className="font-mono"
            style={{ color: path.co2_at_exit ? getCO2Color(path.co2_at_exit) : undefined }}
          >
            {path.co2_at_exit != null ? formatCO2(path.co2_at_exit) : 'N/A'}
          </span>
        </div>
      </div>

      {path.pipelines.length > 0 && (
        <div className="mt-1.5 text-[10px] text-text-secondary truncate">
          {path.pipelines.join(' > ')}
        </div>
      )}
    </button>
  );
}
