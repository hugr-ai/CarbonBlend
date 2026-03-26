import { create } from 'zustand';
import type { Scenario } from '@/types/scenario';

interface ScenarioState {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  comparisonIds: string[];
  selectedFieldNpdid: number | null;
  activeTab: 'map' | 'network' | 'scenarios' | 'compare' | 'results';

  // Actions
  addScenario: (scenario: Scenario) => void;
  removeScenario: (id: string) => void;
  setActive: (id: string | null) => void;
  addToComparison: (id: string) => void;
  removeFromComparison: (id: string) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  setSelectedField: (npdid: number | null) => void;
  setActiveTab: (tab: ScenarioState['activeTab']) => void;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  scenarios: [],
  activeScenarioId: null,
  comparisonIds: [],
  selectedFieldNpdid: null,
  activeTab: 'map',

  addScenario: (scenario) =>
    set((state) => ({
      scenarios: [...state.scenarios, scenario],
      activeScenarioId: scenario.id,
    })),

  removeScenario: (id) =>
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== id),
      activeScenarioId:
        state.activeScenarioId === id ? null : state.activeScenarioId,
      comparisonIds: state.comparisonIds.filter((cid) => cid !== id),
    })),

  setActive: (id) => set({ activeScenarioId: id }),

  addToComparison: (id) =>
    set((state) => {
      if (state.comparisonIds.includes(id) || state.comparisonIds.length >= 4)
        return state;
      return { comparisonIds: [...state.comparisonIds, id] };
    }),

  removeFromComparison: (id) =>
    set((state) => ({
      comparisonIds: state.comparisonIds.filter((cid) => cid !== id),
    })),

  updateScenario: (id, updates) =>
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  setSelectedField: (npdid) => set({ selectedFieldNpdid: npdid }),

  setActiveTab: (tab) => set({ activeTab: tab }),
}));
