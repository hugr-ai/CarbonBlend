import { useQuery } from '@tanstack/react-query';
import { getNetwork, getSubgraph } from '@/api/client';

export function useNetwork(fieldNpdid?: number | null) {
  return useQuery({
    queryKey: ['network', fieldNpdid],
    queryFn: () =>
      fieldNpdid ? getSubgraph(fieldNpdid) : getNetwork(),
    staleTime: 5 * 60 * 1000,
  });
}
