import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { useScenarioStore } from '@/stores/scenarioStore';
import { MapView } from '@/components/map-view/MapView';
import { NetworkGraph } from '@/components/network-graph/NetworkGraph';
import { ScenarioBuilder } from '@/components/scenario/ScenarioBuilder';
import { ScenarioPanel } from '@/components/scenario/ScenarioPanel';
import { ScenarioComparison } from '@/components/scenario/ScenarioComparison';
import { OptimizationResults } from '@/components/results/OptimizationResults';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function TabContent() {
  const activeTab = useScenarioStore((s) => s.activeTab);
  const scenarios = useScenarioStore((s) => s.scenarios);

  switch (activeTab) {
    case 'map':
      return <MapView />;
    case 'network':
      return <NetworkGraph />;
    case 'scenarios':
      return scenarios.length > 0 ? (
        <div className="flex h-full">
          <div className="flex-1 overflow-hidden">
            <ScenarioBuilder />
          </div>
          <div className="w-[340px] border-l border-border overflow-hidden">
            <ScenarioPanel />
          </div>
        </div>
      ) : (
        <ScenarioBuilder />
      );
    case 'compare':
      return <ScenarioComparison />;
    case 'results':
      return <OptimizationResults />;
    default:
      return <MapView />;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <TabContent />
      </AppShell>
    </QueryClientProvider>
  );
}
