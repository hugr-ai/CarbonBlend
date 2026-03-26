import { useQuery } from '@tanstack/react-query';
import { getRiskRegister } from '@/api/client';
import { Loader2, ShieldAlert } from 'lucide-react';
import type { RiskItem } from '@/types/scenario';

interface RiskRegisterProps {
  scenarioId: string;
}

const likelihoodColor: Record<string, string> = {
  low: 'bg-success/20 text-success',
  medium: 'bg-warning/20 text-warning',
  high: 'bg-danger/20 text-danger',
};

const impactColor: Record<string, string> = {
  low: 'bg-success/20 text-success',
  medium: 'bg-warning/20 text-warning',
  high: 'bg-danger/20 text-danger',
};

export function RiskRegister({ scenarioId }: RiskRegisterProps) {
  const { data, isLoading, error } = useQuery<RiskItem[]>({
    queryKey: ['risk-register', scenarioId],
    queryFn: () => getRiskRegister(scenarioId),
    staleTime: 60000,
  });

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-semibold text-text-primary">
          Risk Register
        </h3>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-teal animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-xs text-text-secondary text-center py-4">
          Risk register unavailable
        </p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-text-secondary font-semibold">
                  Category
                </th>
                <th className="text-left px-3 py-2 text-text-secondary font-semibold">
                  Description
                </th>
                <th className="text-left px-3 py-2 text-text-secondary font-semibold">
                  Likelihood
                </th>
                <th className="text-left px-3 py-2 text-text-secondary font-semibold">
                  Impact
                </th>
                <th className="text-left px-3 py-2 text-text-secondary font-semibold">
                  Mitigation
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((risk, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-3 py-2 text-text-primary font-medium whitespace-nowrap">
                    {risk.category}
                  </td>
                  <td className="px-3 py-2 text-text-secondary max-w-[250px]">
                    {risk.description}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        likelihoodColor[risk.likelihood]
                      }`}
                    >
                      {risk.likelihood}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        impactColor[risk.impact]
                      }`}
                    >
                      {risk.impact}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary max-w-[200px]">
                    {risk.mitigation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.length === 0 && (
        <p className="text-xs text-text-secondary text-center py-4">
          No risks identified
        </p>
      )}
    </div>
  );
}
