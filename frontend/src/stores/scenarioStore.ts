import { create } from 'zustand';
import type { Scenario } from '@/types/scenario';

export interface FieldFiltersState {
  area: string | null;
  status: string | null;
  hc_type: string | null;
  co2_min: number | null;
  co2_max: number | null;
  operator: string | null;
  assetType: 'fields' | 'discoveries' | 'all';
}

interface ScenarioState {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  comparisonIds: string[];
  selectedFieldNpdid: number | null;
  activeTab: 'map' | 'network' | 'scenarios' | 'compare' | 'results';
  filters: FieldFiltersState;

  // Actions
  addScenario: (scenario: Scenario) => void;
  removeScenario: (id: string) => void;
  setActive: (id: string | null) => void;
  addToComparison: (id: string) => void;
  removeFromComparison: (id: string) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  setSelectedField: (npdid: number | null) => void;
  setActiveTab: (tab: ScenarioState['activeTab']) => void;
  setFilters: (filters: Partial<FieldFiltersState>) => void;
  resetFilters: () => void;
}

const defaultFilters: FieldFiltersState = {
  area: null,
  status: null,
  hc_type: null,
  co2_min: null,
  co2_max: null,
  operator: null,
  assetType: 'fields',
};

export const useScenarioStore = create<ScenarioState>((set) => ({
  scenarios: [],
  activeScenarioId: null,
  comparisonIds: [],
  selectedFieldNpdid: null,
  activeTab: 'map',
  filters: { ...defaultFilters },

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

  setFilters: (updates) =>
    set((state) => ({
      filters: { ...state.filters, ...updates },
    })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));
