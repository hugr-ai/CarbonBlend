import { useQuery } from '@tanstack/react-query';
import { getNetwork, getSubgraph } from '@/api/client';

/**
 * Fetches the network graph data.
 * - When no field is selected: fetches /api/network (key infrastructure overview)
 * - When a field is selected: fetches /api/network/subgraph/{npdid} (focused view)
 *
 * Automatically refetches when the field selection changes.
 */
export function useNetwork(fieldNpdid?: number | null) {
  return useQuery({
    queryKey: ['network', fieldNpdid ?? 'overview'],
    queryFn: () =>
      fieldNpdid ? getSubgraph(fieldNpdid) : getNetwork(),
    staleTime: 5 * 60 * 1000,
    // Keep previous data while refetching for smooth transitions
    placeholderData: (previousData) => previousData,
  });
}
