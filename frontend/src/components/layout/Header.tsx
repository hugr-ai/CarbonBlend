import { Hexagon, Map, Network, FlaskConical, GitCompare, BarChart3 } from 'lucide-react';
import { useScenarioStore } from '@/stores/scenarioStore';

const tabs = [
  { id: 'map' as const, label: 'Map', icon: Map },
  { id: 'network' as const, label: 'Network', icon: Network },
  { id: 'scenarios' as const, label: 'Scenarios', icon: FlaskConical },
  { id: 'compare' as const, label: 'Compare', icon: GitCompare },
  { id: 'results' as const, label: 'Results', icon: BarChart3 },
];

export function Header() {
  const activeTab = useScenarioStore((s) => s.activeTab);
  const setActiveTab = useScenarioStore((s) => s.setActiveTab);

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-surface border-b border-border shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Hexagon className="w-7 h-7 text-teal" strokeWidth={2} />
          <span className="text-lg font-semibold text-teal tracking-wide">
            CarbonBlend
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-teal-dim text-teal'
                : 'text-text-secondary hover:text-text-primary hover:bg-teal-dim/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="w-[140px]" />
    </header>
  );
}
