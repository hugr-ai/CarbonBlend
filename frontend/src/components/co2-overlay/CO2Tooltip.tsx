import { formatCO2, isWithinCO2Limit } from '@/utils/co2Calculations';

interface CO2TooltipProps {
  x: number;
  y: number;
  name: string;
  co2?: number | null;
  source?: string;
  type: string;
}

export function CO2Tooltip({ x, y, name, co2, source, type }: CO2TooltipProps) {
  const withinLimit = co2 != null ? isWithinCO2Limit(co2) : null;

  return (
    <div
      className="absolute z-20 pointer-events-none bg-surface/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg"
      style={{
        left: x + 12,
        top: y - 12,
        maxWidth: 240,
      }}
    >
      <div className="text-xs text-text-secondary">{type}</div>
      <div className="text-sm font-semibold text-text-primary">{name}</div>

      {co2 != null && (
        <div className="mt-1 space-y-0.5">
          <div className="text-xs">
            <span className="text-text-secondary">CO2: </span>
            <span className="font-mono font-medium text-text-primary">
              {formatCO2(co2)}
            </span>
          </div>
          <div className="text-xs">
            {withinLimit ? (
              <span className="text-success">Within 2.5% limit</span>
            ) : (
              <span className="text-danger">
                Exceeds limit by {(co2 - 2.5).toFixed(1)} mol%
              </span>
            )}
          </div>
          {source && (
            <div className="text-[10px] text-text-secondary">
              Source: {source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
