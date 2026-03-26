import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUMMCapacityStatus } from '@/api/client';
import type { UMMCapacityStatus } from '@/api/client';

/**
 * Returns map layer paint expressions for UMM capacity status overlays.
 * These can be used to add colored rings around facility markers on the map.
 */
export function useUMMMapData() {
  const { data: capacityStatus } = useQuery<UMMCapacityStatus[]>({
    queryKey: ['umm-capacity-status'],
    queryFn: getUMMCapacityStatus,
    staleTime: 60000,
    refetchInterval: 300000,
  });

  const facilityStatusMap = useMemo(() => {
    if (!capacityStatus) return new Map<string, UMMCapacityStatus>();
    const map = new Map<string, UMMCapacityStatus>();
    for (const status of capacityStatus) {
      map.set(status.facility.toLowerCase(), status);
    }
    return map;
  }, [capacityStatus]);

  return { facilityStatusMap, capacityStatus };
}

/**
 * Small badge component to show UMM status inline.
 */
interface UMMStatusDotProps {
  facilityName: string;
  size?: 'sm' | 'md';
}

const statusDotColors: Record<string, string> = {
  green: '#51cf66',
  amber: '#ffa94d',
  red: '#ff6b6b',
};

export function UMMStatusDot({ facilityName, size = 'sm' }: UMMStatusDotProps) {
  const { facilityStatusMap } = useUMMMapData();
  const status = facilityStatusMap.get(facilityName.toLowerCase());

  if (!status || status.status === 'green') return null;

  const color = statusDotColors[status.status] ?? statusDotColors.green;
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <span
      className={`inline-block ${dotSize} rounded-full animate-pulse`}
      style={{ backgroundColor: color }}
      title={`${status.facility}: ${status.status} - ${status.total_capacity_impact_pct ?? 0}% impact`}
    />
  );
}

/**
 * UMM status legend for map overlays.
 */
export function UMMMapLegend() {
  return (
    <div className="bg-surface/90 backdrop-blur-sm border border-border rounded-lg p-2 text-[10px]">
      <p className="text-text-secondary font-semibold mb-1">UMM Status</p>
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-text-secondary">Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-text-secondary">Reduced capacity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-danger" />
          <span className="text-text-secondary">Unavailable</span>
        </div>
      </div>
    </div>
  );
}
