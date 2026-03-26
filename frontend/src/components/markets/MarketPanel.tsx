import { useQuery } from '@tanstack/react-query';
import { getExportTerminals } from '@/api/client';
import { countryFlag } from '@/utils/formatters';
import { Loader2 } from 'lucide-react';

interface MarketPanelProps {
  onTerminalSelect?: (terminalName: string) => void;
}

export function MarketPanel({ onTerminalSelect }: MarketPanelProps) {
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
        {terminals?.map((t) => (
          <button
            key={t.id}
            onClick={() => onTerminalSelect?.(t.name)}
            className="bg-surface border border-border rounded-xl p-4 text-left hover:border-teal/30 transition-colors"
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
        ))}
      </div>
    </div>
  );
}
