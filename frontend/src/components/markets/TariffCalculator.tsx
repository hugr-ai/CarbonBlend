import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { X, Calculator, GitCompare, Loader2 } from 'lucide-react';
import { getAvailableSegments, calculateEnhancedRouteCost } from '@/api/client';
import type { EnhancedRouteCostResponse, SegmentCostDetail } from '@/api/client';

interface RouteState {
  segments: string[];
  result: EnhancedRouteCostResponse | null;
  loading: boolean;
  flowRate: number;
}

function emptyRoute(): RouteState {
  return { segments: [], result: null, loading: false, flowRate: 10 };
}

export function TariffCalculator() {
  const [routes, setRoutes] = useState<RouteState[]>([emptyRoute()]);
  const [comparing, setComparing] = useState(false);

  const { data: tariffSegments, isLoading: tariffsLoading } = useQuery({
    queryKey: ['tariff-segments'],
    queryFn: getAvailableSegments,
    staleTime: 300000,
  });

  const availableSegments = useMemo(() => {
    if (!tariffSegments) return [];
    return tariffSegments
      .map((t) => t.pipeline_segment)
      .sort();
  }, [tariffSegments]);

  const addSegment = (routeIdx: number, segment: string) => {
    setRoutes(prev => {
      const updated = [...prev];
      updated[routeIdx] = { ...updated[routeIdx], segments: [...updated[routeIdx].segments, segment], result: null };
      return updated;
    });
  };

  const removeSegment = (routeIdx: number, segIdx: number) => {
    setRoutes(prev => {
      const updated = [...prev];
      const newSegs = [...updated[routeIdx].segments];
      newSegs.splice(segIdx, 1);
      updated[routeIdx] = { ...updated[routeIdx], segments: newSegs, result: null };
      return updated;
    });
  };

  const setFlowRate = (routeIdx: number, rate: number) => {
    setRoutes(prev => {
      const updated = [...prev];
      updated[routeIdx] = { ...updated[routeIdx], flowRate: rate, result: null };
      return updated;
    });
  };

  const calculateRoute = async (routeIdx: number) => {
    const route = routes[routeIdx];
    if (route.segments.length === 0) return;

    setRoutes(prev => {
      const updated = [...prev];
      updated[routeIdx] = { ...updated[routeIdx], loading: true };
      return updated;
    });

    try {
      const result = await calculateEnhancedRouteCost(route.segments, route.flowRate);
      setRoutes(prev => {
        const updated = [...prev];
        updated[routeIdx] = { ...updated[routeIdx], result, loading: false };
        return updated;
      });
    } catch (err) {
      console.error('Route calculation failed:', err);
      setRoutes(prev => {
        const updated = [...prev];
        updated[routeIdx] = { ...updated[routeIdx], loading: false };
        return updated;
      });
    }
  };

  const toggleCompare = () => {
    if (comparing) {
      setRoutes(prev => [prev[0]]);
      setComparing(false);
    } else {
      setRoutes(prev => [...prev, emptyRoute()]);
      setComparing(true);
    }
  };

  // Chart data for stacked bar
  const chartData = useMemo(() => {
    return routes
      .filter(r => r.result)
      .flatMap((r, routeIdx) =>
        (r.result?.segments ?? []).map((seg: SegmentCostDetail) => ({
          name: seg.pipeline_segment.length > 15 ? seg.pipeline_segment.substring(0, 15) + '...' : seg.pipeline_segment,
          K: seg.k_element ?? 0,
          U: seg.u_element ?? 0,
          I: seg.i_element ?? 0,
          O: seg.o_element ?? 0,
          route: `Route ${routeIdx + 1}`,
        }))
      );
  }, [routes]);

  if (tariffsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-teal" />
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Tariff Route Calculator
          </h3>
        </div>
        <button
          onClick={toggleCompare}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            comparing
              ? 'bg-warning/20 text-warning'
              : 'bg-surface border border-border text-text-secondary hover:border-teal/30'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          {comparing ? 'Exit Compare' : 'Compare Routes'}
        </button>
      </div>

      {/* Route builders */}
      <div className={`grid gap-4 ${comparing ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {routes.map((route, routeIdx) => (
          <div key={routeIdx} className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-text-primary">
              {comparing ? `Route ${routeIdx + 1}` : 'Pipeline Route'}
            </h4>

            {/* Selected segments */}
            <div className="space-y-1">
              {route.segments.map((seg, segIdx) => (
                <div key={segIdx} className="flex items-center gap-2 bg-navy rounded-lg px-2 py-1.5">
                  <span className="text-[10px] text-teal font-mono w-5">{segIdx + 1}.</span>
                  <span className="flex-1 text-xs text-text-primary truncate">{seg}</span>
                  <button
                    onClick={() => removeSegment(routeIdx, segIdx)}
                    className="text-text-secondary hover:text-danger transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {route.segments.length === 0 && (
                <p className="text-xs text-text-secondary italic py-2">Add pipeline segments to build a route</p>
              )}
            </div>

            {/* Segment selector */}
            <div className="flex gap-2">
              <select
                className="flex-1 bg-navy border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    addSegment(routeIdx, e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="" disabled>Add segment...</option>
                {availableSegments.map((seg: string) => (
                  <option key={seg} value={seg}>{seg}</option>
                ))}
              </select>
            </div>

            {/* Flow rate */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-secondary whitespace-nowrap">Flow rate:</label>
              <input
                type="number"
                value={route.flowRate}
                onChange={(e) => setFlowRate(routeIdx, parseFloat(e.target.value) || 0)}
                className="w-20 bg-navy border border-border rounded-lg px-2 py-1 text-xs text-text-primary font-mono"
                min={0}
                step={1}
              />
              <span className="text-xs text-text-secondary">MSm3/d</span>
            </div>

            {/* Calculate button */}
            <button
              onClick={() => calculateRoute(routeIdx)}
              disabled={route.segments.length === 0 || route.loading}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-teal text-navy rounded-lg text-xs font-medium hover:bg-teal/90 disabled:opacity-40 transition-colors"
            >
              {route.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Calculator className="w-3.5 h-3.5" />
              )}
              Calculate Tariff
            </button>

            {/* Results */}
            {route.result && (
              <div className="space-y-3 pt-2 border-t border-border">
                {/* Total */}
                <div className="rounded-lg p-3" style={{ background: 'rgba(0, 212, 170, 0.06)', border: '1px solid rgba(0, 212, 170, 0.15)' }}>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[10px] text-text-secondary uppercase tracking-wider">Total Route Tariff</div>
                      <div className="text-xl font-bold font-mono text-teal">
                        {route.result.total_tariff_nok_sm3.toFixed(4)}
                        <span className="text-xs text-text-secondary font-normal ml-1">NOK/Sm3</span>
                      </div>
                    </div>
                    {route.result.annualized_cost_mnok != null && (
                      <div className="text-right">
                        <div className="text-[10px] text-text-secondary">Annualized</div>
                        <div className="text-sm font-bold font-mono text-warning">
                          {route.result.annualized_cost_mnok.toFixed(1)}
                          <span className="text-[10px] text-text-secondary font-normal ml-1">MNOK/yr</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* K/U/I/O totals */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'K', value: route.result.total_k_element, color: '#b8ffe1' },
                    { label: 'U', value: route.result.total_u_element, color: '#00d4aa' },
                    { label: 'I', value: route.result.total_i_element, color: '#4a6fa5' },
                    { label: 'O', value: route.result.total_o_element, color: '#ffa94d' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-navy rounded-lg p-2 text-center">
                      <div className="text-[9px] text-text-secondary">{label} Element</div>
                      <div className="text-xs font-mono font-bold" style={{ color }}>{value.toFixed(4)}</div>
                    </div>
                  ))}
                </div>

                {/* Per-segment table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-1 py-1 text-text-secondary font-semibold">Segment</th>
                        <th className="text-right px-1 py-1 text-text-secondary font-semibold">K</th>
                        <th className="text-right px-1 py-1 text-text-secondary font-semibold">U</th>
                        <th className="text-right px-1 py-1 text-text-secondary font-semibold">I</th>
                        <th className="text-right px-1 py-1 text-text-secondary font-semibold">O</th>
                        <th className="text-right px-1 py-1 text-text-secondary font-semibold">Total</th>
                        <th className="text-right px-1 py-1 text-text-secondary font-semibold">Cumul.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {route.result.segments.map((seg: SegmentCostDetail, i: number) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="px-1 py-1 text-text-primary truncate max-w-[100px]">{seg.pipeline_segment}</td>
                          <td className="px-1 py-1 text-right font-mono text-text-secondary">{(seg.k_element ?? 0).toFixed(4)}</td>
                          <td className="px-1 py-1 text-right font-mono text-text-secondary">{(seg.u_element ?? 0).toFixed(4)}</td>
                          <td className="px-1 py-1 text-right font-mono text-text-secondary">{(seg.i_element ?? 0).toFixed(4)}</td>
                          <td className="px-1 py-1 text-right font-mono text-text-secondary">{(seg.o_element ?? 0).toFixed(4)}</td>
                          <td className="px-1 py-1 text-right font-mono text-teal">{seg.unit_tariff_nok_sm3.toFixed(4)}</td>
                          <td className="px-1 py-1 text-right font-mono text-warning">{seg.cumulative_tariff_nok_sm3.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Missing segments warning */}
                {route.result.missing_segments.length > 0 && (
                  <div className="text-[10px] text-danger bg-danger/10 rounded-lg p-2">
                    Missing tariff data for: {route.result.missing_segments.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stacked bar chart for all routes that have results */}
      {chartData.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            K/U/I/O Breakdown per Segment
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,255,225,0.1)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#8899bb', fontSize: 9 }}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: '#8899bb', fontSize: 9 }}
                label={{
                  value: 'NOK/Sm3',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#8899bb',
                  fontSize: 9,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a1628',
                  border: '1px solid rgba(184,255,225,0.15)',
                  borderRadius: 8,
                  color: '#e8edf5',
                  fontSize: 11,
                }}
                formatter={(value: number) => value.toFixed(4)}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="K" name="K (Capital)" stackId="a" fill="#b8ffe1" />
              <Bar dataKey="U" name="U (Upgrade)" stackId="a" fill="#00d4aa" />
              <Bar dataKey="I" name="I (Investment)" stackId="a" fill="#4a6fa5" />
              <Bar dataKey="O" name="O (Operating)" stackId="a" fill="#ffa94d" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparison summary when both routes have results */}
      {comparing && routes[0]?.result && routes[1]?.result && (
        <div className="bg-surface border border-warning/30 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-warning uppercase tracking-wider mb-3">
            Route Comparison
          </h4>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div />
            <div className="text-center font-semibold text-text-primary">Route 1</div>
            <div className="text-center font-semibold text-text-primary">Route 2</div>

            <div className="text-text-secondary">Total Tariff</div>
            <div className="text-center font-mono text-teal">{routes[0].result.total_tariff_nok_sm3.toFixed(4)}</div>
            <div className="text-center font-mono text-teal">{routes[1].result.total_tariff_nok_sm3.toFixed(4)}</div>

            <div className="text-text-secondary">Segments</div>
            <div className="text-center font-mono text-text-primary">{routes[0].result.num_segments}</div>
            <div className="text-center font-mono text-text-primary">{routes[1].result.num_segments}</div>

            {routes[0].result.annualized_cost_mnok != null && routes[1].result.annualized_cost_mnok != null && (
              <>
                <div className="text-text-secondary">Annual Cost</div>
                <div className="text-center font-mono text-warning">{routes[0].result.annualized_cost_mnok.toFixed(1)} MNOK</div>
                <div className="text-center font-mono text-warning">{routes[1].result.annualized_cost_mnok.toFixed(1)} MNOK</div>
              </>
            )}

            <div className="text-text-secondary font-semibold">Cheaper</div>
            <div className="col-span-2 text-center font-semibold">
              {routes[0].result.total_tariff_nok_sm3 < routes[1].result.total_tariff_nok_sm3 ? (
                <span className="text-success">Route 1 by {((routes[1].result.total_tariff_nok_sm3 - routes[0].result.total_tariff_nok_sm3) / routes[1].result.total_tariff_nok_sm3 * 100).toFixed(1)}%</span>
              ) : routes[0].result.total_tariff_nok_sm3 > routes[1].result.total_tariff_nok_sm3 ? (
                <span className="text-success">Route 2 by {((routes[0].result.total_tariff_nok_sm3 - routes[1].result.total_tariff_nok_sm3) / routes[0].result.total_tariff_nok_sm3 * 100).toFixed(1)}%</span>
              ) : (
                <span className="text-text-secondary">Equal</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
