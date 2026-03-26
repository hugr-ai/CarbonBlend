import { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';

const defaultWeights: Record<string, number> = {
  Economics: 30,
  Technical: 25,
  Risk: 25,
  Strategic: 20,
};

export function WeightSliders() {
  const [weights, setWeights] = useState<Record<string, number>>({ ...defaultWeights });

  const isModified = useMemo(
    () =>
      Object.entries(weights).some(
        ([key, val]) => val !== defaultWeights[key]
      ),
    [weights]
  );

  const total = Object.values(weights).reduce((s, v) => s + v, 0);

  const handleChange = (category: string, value: number) => {
    setWeights((prev) => ({ ...prev, [category]: value }));
  };

  const handleReset = () => {
    setWeights({ ...defaultWeights });
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            Criteria Weights
          </h3>
          {isModified && (
            <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full">
              Modified
            </span>
          )}
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-teal transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(weights).map(([category, value]) => (
          <div key={category}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-primary">{category}</span>
              <span className="font-mono text-text-secondary">
                {value}% ({total > 0 ? ((value / total) * 100).toFixed(0) : 0}%
                normalized)
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={value}
              onChange={(e) => handleChange(category, Number(e.target.value))}
              className="w-full accent-teal"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs">
        <span className="text-text-secondary">
          Total: {total}%
        </span>
        {total !== 100 && (
          <span className="text-warning">
            Weights will be normalized to 100%
          </span>
        )}
      </div>
    </div>
  );
}
