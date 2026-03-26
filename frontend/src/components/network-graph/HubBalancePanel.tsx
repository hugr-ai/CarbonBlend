import { useQuery } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { getHubBalance } from '@/api/client';
import { getCO2Color } from '@/utils/co2Calculations';

interface HubBalancePanelProps {
  facilityNpdid: number;
  hubName: string;
  onClose: () => void;
}

export function HubBalancePanel({ facilityNpdid, hubName, onClose }: HubBalancePanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['hub-balance', facilityNpdid],
    queryFn: () => getHubBalance(facilityNpdid),
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0, 16, 77, 0.95)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-teal animate-spin" />
          <span className="text-sm text-text-secondary">Loading flow balance...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0, 16, 77, 0.95)' }}>
        <div className="text-center">
          <p className="text-danger text-sm">Failed to load hub balance</p>
          <button onClick={onClose} className="mt-2 text-xs text-text-secondary hover:text-text-primary">Close</button>
        </div>
      </div>
    );
  }

  const { inputs, outputs, blended_co2_mol_pct, total_input_mscm_d, total_output_mscm_d, co2_removal_at_hub } = data;

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = Math.max(360, Math.max(inputs.length, outputs.length) * 60 + 160);
  const hubX = svgWidth / 2;
  const hubY = svgHeight / 2;
  const hubW = 140;
  const hubH = 80;

  const inputStartX = 40;
  const outputEndX = svgWidth - 40;

  const inputSpacing = inputs.length > 0 ? Math.min(55, (svgHeight - 80) / inputs.length) : 55;
  const outputSpacing = outputs.length > 0 ? Math.min(55, (svgHeight - 80) / outputs.length) : 55;

  const inputStartY = hubY - ((inputs.length - 1) * inputSpacing) / 2;
  const outputStartY = hubY - ((outputs.length - 1) * outputSpacing) / 2;

  return (
    <div className="absolute inset-0 z-30 overflow-auto" style={{ background: 'rgba(0, 16, 77, 0.97)' }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-text-secondary">Flow Balance</div>
            <h2 className="text-lg font-bold text-white">{data.hub_name}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
              <span>Total throughput: <span className="text-teal font-mono">{total_input_mscm_d} MSm3/d</span></span>
              {blended_co2_mol_pct != null && (
                <span>Blended CO2: <span className="font-mono" style={{ color: getCO2Color(blended_co2_mol_pct) }}>{blended_co2_mol_pct.toFixed(1)} mol%</span></span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-none"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Sankey-style SVG diagram */}
        <div className="overflow-x-auto bg-surface border border-border rounded-xl p-2">
          <svg width={svgWidth} height={svgHeight} className="mx-auto">
            {/* Hub center box */}
            <rect
              x={hubX - hubW / 2}
              y={hubY - hubH / 2}
              width={hubW}
              height={hubH}
              rx={10}
              fill="rgba(0, 212, 170, 0.12)"
              stroke="#00d4aa"
              strokeWidth={2}
            />
            <text x={hubX} y={hubY - 12} textAnchor="middle" fill="#00d4aa" fontSize={10} fontWeight={700}>
              HUB
            </text>
            <text x={hubX} y={hubY + 5} textAnchor="middle" fill="#e8edf5" fontSize={12} fontWeight={600}>
              {data.hub_name.length > 14 ? data.hub_name.substring(0, 14) + '...' : data.hub_name}
            </text>
            <text x={hubX} y={hubY + 22} textAnchor="middle" fill="#8899bb" fontSize={9}>
              {total_input_mscm_d} MSm3/d
            </text>
            {blended_co2_mol_pct != null && (
              <text x={hubX} y={hubY + 35} textAnchor="middle" fill={getCO2Color(blended_co2_mol_pct)} fontSize={9} fontWeight={600}>
                CO2: {blended_co2_mol_pct.toFixed(1)} mol%
              </text>
            )}

            {/* CO2 Removal indicator */}
            {co2_removal_at_hub && (
              <g>
                <rect
                  x={hubX - 50}
                  y={hubY + hubH / 2 + 10}
                  width={100}
                  height={30}
                  rx={6}
                  fill="rgba(81, 207, 102, 0.12)"
                  stroke="#51cf66"
                  strokeWidth={1}
                />
                <text x={hubX} y={hubY + hubH / 2 + 30} textAnchor="middle" fill="#51cf66" fontSize={9} fontWeight={600}>
                  CO2 Removal
                </text>
              </g>
            )}

            {/* Input streams */}
            {inputs.map((inp, i) => {
              const y = inputStartY + i * inputSpacing;
              const co2Color = inp.co2_mol_pct != null ? getCO2Color(inp.co2_mol_pct) : '#8899bb';
              const flowWidth = Math.max(2, Math.min(12, (inp.flow_mscm_d || 5) / 5));

              return (
                <g key={`in-${i}`}>
                  {/* Input box */}
                  <rect
                    x={inputStartX}
                    y={y - 18}
                    width={140}
                    height={36}
                    rx={6}
                    fill="rgba(10, 22, 40, 0.9)"
                    stroke={co2Color}
                    strokeWidth={1}
                  />
                  <text x={inputStartX + 70} y={y - 3} textAnchor="middle" fill="#e8edf5" fontSize={9} fontWeight={500}>
                    {(inp.source || 'Unknown').length > 18 ? (inp.source || 'Unknown').substring(0, 18) + '...' : (inp.source || 'Unknown')}
                  </text>
                  <text x={inputStartX + 70} y={y + 11} textAnchor="middle" fill="#8899bb" fontSize={8}>
                    {inp.flow_mscm_d?.toFixed(1) || '?'} MSm3/d
                    {inp.co2_mol_pct != null ? ` | ${inp.co2_mol_pct.toFixed(1)}%` : ''}
                  </text>

                  {/* Flow line */}
                  <line
                    x1={inputStartX + 140}
                    y1={y}
                    x2={hubX - hubW / 2}
                    y2={hubY}
                    stroke={co2Color}
                    strokeWidth={flowWidth}
                    strokeOpacity={0.5}
                  />
                  {/* CO2 color dot at entry */}
                  {inp.co2_mol_pct != null && (
                    <circle cx={inputStartX + 145} cy={y} r={4} fill={co2Color} />
                  )}

                  {/* Pipeline label on the line */}
                  {inp.pipeline && (
                    <text
                      x={(inputStartX + 140 + hubX - hubW / 2) / 2}
                      y={y + (hubY - y) / 2 - 5}
                      textAnchor="middle"
                      fill="#667799"
                      fontSize={7}
                      transform={`rotate(${Math.atan2(hubY - y, hubX - hubW / 2 - inputStartX - 140) * 180 / Math.PI}, ${(inputStartX + 140 + hubX - hubW / 2) / 2}, ${y + (hubY - y) / 2 - 5})`}
                    >
                      {inp.pipeline.length > 20 ? inp.pipeline.substring(0, 20) + '...' : inp.pipeline}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Output streams */}
            {outputs.map((out, i) => {
              const y = outputStartY + i * outputSpacing;
              const co2Color = out.co2_mol_pct != null ? getCO2Color(out.co2_mol_pct) : '#8899bb';
              const flowWidth = Math.max(2, Math.min(12, (out.flow_mscm_d || 5) / 5));

              return (
                <g key={`out-${i}`}>
                  {/* Output box */}
                  <rect
                    x={outputEndX - 140}
                    y={y - 18}
                    width={140}
                    height={36}
                    rx={6}
                    fill="rgba(10, 22, 40, 0.9)"
                    stroke={co2Color}
                    strokeWidth={1}
                  />
                  <text x={outputEndX - 70} y={y - 3} textAnchor="middle" fill="#e8edf5" fontSize={9} fontWeight={500}>
                    {(out.destination || 'Unknown').length > 18 ? (out.destination || 'Unknown').substring(0, 18) + '...' : (out.destination || 'Unknown')}
                  </text>
                  <text x={outputEndX - 70} y={y + 11} textAnchor="middle" fill="#8899bb" fontSize={8}>
                    {out.flow_mscm_d?.toFixed(1) || '?'} MSm3/d
                    {out.co2_mol_pct != null ? ` | ${out.co2_mol_pct.toFixed(1)}%` : ''}
                  </text>

                  {/* Flow line */}
                  <line
                    x1={hubX + hubW / 2}
                    y1={hubY}
                    x2={outputEndX - 140}
                    y2={y}
                    stroke={co2Color}
                    strokeWidth={flowWidth}
                    strokeOpacity={0.5}
                  />

                  {/* Arrow head */}
                  <polygon
                    points={`${outputEndX - 144},${y - 4} ${outputEndX - 138},${y} ${outputEndX - 144},${y + 4}`}
                    fill={co2Color}
                    fillOpacity={0.7}
                  />

                  {/* Pipeline label */}
                  {out.pipeline && (
                    <text
                      x={(hubX + hubW / 2 + outputEndX - 140) / 2}
                      y={hubY + (y - hubY) / 2 - 5}
                      textAnchor="middle"
                      fill="#667799"
                      fontSize={7}
                      transform={`rotate(${Math.atan2(y - hubY, outputEndX - 140 - hubX - hubW / 2) * 180 / Math.PI}, ${(hubX + hubW / 2 + outputEndX - 140) / 2}, ${hubY + (y - hubY) / 2 - 5})`}
                    >
                      {out.pipeline.length > 20 ? out.pipeline.substring(0, 20) + '...' : out.pipeline}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Labels */}
            <text x={inputStartX + 70} y={20} textAnchor="middle" fill="#667799" fontSize={10} fontWeight={600}>
              INPUTS
            </text>
            <text x={outputEndX - 70} y={20} textAnchor="middle" fill="#667799" fontSize={10} fontWeight={600}>
              OUTPUTS
            </text>
          </svg>
        </div>

        {/* Summary table */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Inputs table */}
          <div className="bg-surface border border-border rounded-xl p-3">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Inputs ({inputs.length})</h4>
            <div className="space-y-1.5">
              {inputs.map((inp, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-navy rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    {inp.co2_mol_pct != null && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCO2Color(inp.co2_mol_pct) }} />
                    )}
                    <span className="text-text-primary truncate max-w-[120px]">{inp.source || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-text-secondary font-mono">
                    <span>{inp.flow_mscm_d?.toFixed(1)} MSm3/d</span>
                    {inp.co2_mol_pct != null && (
                      <span style={{ color: getCO2Color(inp.co2_mol_pct) }}>{inp.co2_mol_pct.toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              ))}
              {inputs.length === 0 && (
                <p className="text-xs text-text-secondary italic">No inputs found</p>
              )}
            </div>
          </div>

          {/* Outputs table */}
          <div className="bg-surface border border-border rounded-xl p-3">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Outputs ({outputs.length})</h4>
            <div className="space-y-1.5">
              {outputs.map((out, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-navy rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    {out.co2_mol_pct != null && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCO2Color(out.co2_mol_pct) }} />
                    )}
                    <span className="text-text-primary truncate max-w-[120px]">{out.destination || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-text-secondary font-mono">
                    <span>{out.flow_mscm_d?.toFixed(1)} MSm3/d</span>
                    {out.co2_mol_pct != null && (
                      <span style={{ color: getCO2Color(out.co2_mol_pct) }}>{out.co2_mol_pct.toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              ))}
              {outputs.length === 0 && (
                <p className="text-xs text-text-secondary italic">No outputs found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
