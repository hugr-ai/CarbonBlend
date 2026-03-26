import { useQuery } from '@tanstack/react-query';
import { getExportTerminals } from '@/api/client';
import { countryFlag } from '@/utils/formatters';
import { Loader2, Calculator } from 'lucide-react';

/** Known typical routes to terminals for pre-selection */
const TYPICAL_ROUTES: Record<string, string[]> = {
  'St Fergus': ['Statpipe', 'Tampen Link', 'FLAGS'],
  'Bacton': ['Langeled South', 'Langeled North'],
  'Easington': ['Langeled South', 'Langeled North'],
  'Emden': ['Europipe I', 'Europipe II'],
  'Dornum': ['Norpipe Gas'],
  'Dunkerque': ['Franpipe'],
  'Zeebrugge': ['Zeepipe'],
};

function getTypicalRoute(terminalName: string): string[] {
  for (const [key, route] of Object.entries(TYPICAL_ROUTES)) {
    if (terminalName.toUpperCase().includes(key.toUpperCase())) {
      return route;
    }
  }
  return [];
}

interface MarketPanelProps {
  onTerminalSelect?: (terminalName: string) => void;
  onCalculateRoute?: (segments: string[]) => void;
}

export function MarketPanel({ onTerminalSelect, onCalculateRoute }: MarketPanelProps) {
  const { data: terminals, isLoading } = useQuery({
    queryKey: ['export-terminals'],
    queryFn: getExportTerminals,
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider px-1">
        Export Markets
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {terminals?.map((t) => {
          const typicalRoute = getTypicalRoute(t.name);
          return (
            <div
              key={t.id}
              className="bg-surface border border-border rounded-xl p-4 hover:border-teal/30 transition-colors"
            >
              <button
                onClick={() => onTerminalSelect?.(t.name)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{countryFlag(t.country)}</span>
                  <div>
                    <h4 className="text-sm font-medium text-text-primary">
                      {t.name}
                    </h4>
                    <span className="text-xs text-text-secondary">{t.country}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div>
                    <span className="text-text-secondary">Hub</span>
                    <p className="text-warning font-medium">{t.hub_name}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Price</span>
                    <p className="text-text-primary font-mono">
                      {t.default_price.toFixed(2)} {t.currency}/MWh
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Capacity</span>
                    <p className="text-text-primary font-mono">
                      {t.capacity_bcm_yr} bcm/yr
                    </p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Feed</span>
                    <p className="text-text-primary truncate">{t.pipeline_feed}</p>
                  </div>
                </div>
              </button>

              {/* Calculate Route Cost button */}
              {typicalRoute.length > 0 && onCalculateRoute && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCalculateRoute(typicalRoute);
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-teal/10 border border-teal/20 text-teal rounded-lg text-[10px] font-medium hover:bg-teal/20 transition-colors"
                >
                  <Calculator className="w-3 h-3" />
                  Calculate Route Cost
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
