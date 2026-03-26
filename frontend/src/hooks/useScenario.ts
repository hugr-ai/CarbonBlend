import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getScenarios,
  createScenario,
  updateScenario as apiUpdateScenario,
  deleteScenario as apiDeleteScenario,
} from '@/api/client';
import { useScenarioStore } from '@/stores/scenarioStore';
import type { Scenario } from '@/types/scenario';

export function useScenarios() {
  const store = useScenarioStore();

  const query = useQuery({
    queryKey: ['scenarios'],
    queryFn: getScenarios,
    staleTime: 30 * 1000,
  });

  return {
    ...query,
    scenarios: store.scenarios.length > 0 ? store.scenarios : (query.data ?? []),
    activeScenario: store.scenarios.find((s) => s.id === store.activeScenarioId) ?? null,
  };
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  const addScenario = useScenarioStore((s) => s.addScenario);

  return useMutation({
    mutationFn: (data: Omit<Scenario, 'id' | 'created_at'>) =>
      createScenario(data),
    onSuccess: (scenario) => {
      addScenario(scenario);
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();
  const updateStore = useScenarioStore((s) => s.updateScenario);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Scenario> }) =>
      apiUpdateScenario(id, updates),
    onSuccess: (scenario) => {
      updateStore(scenario.id, scenario);
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  const removeScenario = useScenarioStore((s) => s.removeScenario);

  return useMutation({
    mutationFn: (id: string) => apiDeleteScenario(id),
    onSuccess: (_, id) => {
      removeScenario(id);
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });
}
