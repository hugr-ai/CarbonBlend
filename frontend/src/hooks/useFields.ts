import { useQuery } from '@tanstack/react-query';
import { getFields, getField, type FieldParams } from '@/api/client';

export function useFields(filters?: FieldParams) {
  return useQuery({
    queryKey: ['fields', filters],
    queryFn: () => getFields(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useField(npdid: number | null) {
  return useQuery({
    queryKey: ['field', npdid],
    queryFn: () => getField(npdid!),
    enabled: npdid !== null,
    staleTime: 5 * 60 * 1000,
  });
}
