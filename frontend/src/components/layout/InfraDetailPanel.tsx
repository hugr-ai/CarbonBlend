import { X, ArrowRight, Gauge, Droplets, TrendingUp, Factory, Anchor, MapPin } from 'lucide-react';
import { getCO2Color } from '@/utils/co2Calculations';

/** Estimate pipeline capacity from diameter (MSm3/d) using industry rule-of-thumb */
function estimateCapacity(diameterInches: number | null | undefined, medium?: string): number | null {
  if (!diameterInches) return null;
  // Gas capacity ~ 0.035 * D^2 (MSm3/d), empirical for NCS trunklines
  // Oil capacity much lower but we focus on gas
  const isGas = !medium || medium.toLowerCase().includes('gas');
  if (isGas) {
    return Math.round(0.035 * diameterInches * diameterInches * 10) / 10;
  }
  // Oil: ~0.015 * D^2 (kbbl/d equivalent, not directly comparable)
  return Math.round(0.015 * diameterInches * diameterInches * 10) / 10;
}

/** Estimate CO2 mass flow from gas flow and CO2 concentration */
function estimateCO2Flow(flowMscmD: number, co2MolPct: number): number {
  // CO2 mass flow (tonnes/day) ≈ flow_rate * co2_fraction * CO2_density_factor
  // At standard conditions, 1 MSm3 gas ≈ 44/22.4 * 1000 tonnes CO2 per mol fraction
  // Simplified: tonnes/d = MSm3/d * co2% / 100 * 1964 (CO2 molar mass factor)
  return Math.round(flowMscmD * (co2MolPct / 100) * 1964 * 10) / 10;
}

// ─── Pipeline Detail ─────────────────────────────────────────────────

interface PipelineData {
  name?: string;
  diameter_inches?: number;
  medium?: string;
  from_facility?: string;
  to_facility?: string;
  main_grouping?: string;
  operator?: string;
  co2_limit?: number;
  tariff_nok_sm3?: number;
}

function PipelineDetail({ data }: { data: PipelineData & { label?: string } }) {
  const name = data.name || data.label || 'Unknown';
  const capacity = estimateCapacity(data.diameter_inches, data.medium);
  const isGas = !data.medium || data.medium.toLowerCase().includes('gas');
  const co2Limit = data.co2_limit ?? 2.5;

  // Example utilization (would come from UMM data in production)
  const utilPct = 72; // Placeholder

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-wider text-text-secondary mb-1">Pipeline</div>
        <div className="text-lg font-bold text-white">{name}</div>
        <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
          <span>{data.from_facility}</span>
          <ArrowRight className="w-3 h-3 text-teal-dark" />
          <span>{data.to_facility}</span>
        </div>
      </div>

      {/* Key specs grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Diameter" value={data.diameter_inches ? `${data.diameter_inches}"` : '--'} icon={<Gauge className="w-3.5 h-3.5" />} />
        <Stat label="Medium" value={data.medium || '--'} icon={<Droplets className="w-3.5 h-3.5" />} color={
          data.medium?.toLowerCase().includes('gas') ? '#00d4aa' :
          data.medium?.toLowerCase().includes('oil') ? '#ffa94d' : '#ff6b35'
        } />
        <Stat label="Operator" value={data.operator || '--'} icon={<Factory className="w-3.5 h-3.5" />} />
        <Stat label="Grouping" value={data.main_grouping || '--'} icon={<MapPin className="w-3.5 h-3.5" />} />
      </div>

      {/* Capacity & Flow section */}
      {capacity && (
        <div className="rounded-lg p-3" style={{ background: 'rgba(0, 212, 170, 0.06)', border: '1px solid rgba(0, 212, 170, 0.15)' }}>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-2">Capacity & Flow</div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-2xl font-bold font-mono text-white">{capacity}</div>
              <div className="text-[10px] text-text-secondary">{isGas ? 'MSm³/d estimated' : 'kbbl/d estimated'}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold font-mono" style={{ color: utilPct > 90 ? '#ff6b6b' : utilPct > 70 ? '#ffa94d' : '#00d4aa' }}>
                {utilPct}%
              </div>
              <div className="text-[10px] text-text-secondary">utilization</div>
            </div>
          </div>
          {/* Capacity bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0, 16, 77, 0.6)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${utilPct}%`,
                background: utilPct > 90 ? '#ff6b6b' : utilPct > 70 ? '#ffa94d' : '#00d4aa',
              }}
            />
          </div>
        </div>
      )}

      {/* CO2 specification */}
      {isGas && (
        <div className="rounded-lg p-3" style={{ background: 'rgba(255, 107, 107, 0.06)', border: '1px solid rgba(255, 107, 107, 0.15)' }}>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-2">CO2 Specification</div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-mono font-bold" style={{ color: getCO2Color(co2Limit) }}>
                {co2Limit} mol% max
              </div>
              <div className="text-[10px] text-text-secondary">pipeline entry spec</div>
            </div>
            {capacity && (
              <div className="text-right">
                <div className="text-sm font-mono text-text-primary">
                  {estimateCO2Flow(capacity * 0.72, co2Limit)} t/d
                </div>
                <div className="text-[10px] text-text-secondary">max CO2 at capacity</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tariff */}
      {data.tariff_nok_sm3 != null && (
        <div className="rounded-lg p-3" style={{ background: 'rgba(184, 255, 225, 0.04)', border: '1px solid rgba(184, 255, 225, 0.1)' }}>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-1">Transport Tariff</div>
          <div className="text-lg font-bold font-mono text-white">
            {data.tariff_nok_sm3.toFixed(3)} <span className="text-xs text-text-secondary font-normal">NOK/Sm³</span>
          </div>
          {capacity && (
            <div className="text-[10px] text-text-secondary mt-1">
              ≈ {(data.tariff_nok_sm3 * capacity * 365 / 1000).toFixed(1)} MNOK/yr at full capacity
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Facility Detail ─────────────────────────────────────────────────

interface FacilityData {
  name?: string;
  kind?: string;
  operator?: string;
  phase?: string;
  functions?: string;
  belongs_to_name?: string;
  water_depth?: number;
  startup_date?: string;
  // Processing plant extras
  capacity_mscm_d?: number;
  has_co2_removal?: boolean;
  // Field extras
  co2_mol_pct?: number;
  hc_type?: string;
  status?: string;
  main_area?: string;
  // Terminal extras
  country?: string;
  hub_name?: string;
  default_price?: number;
  currency?: string;
}

function FacilityDetail({ data, entityType }: { data: FacilityData & { label?: string }; entityType: string }) {
  const isPlant = entityType === 'processing_plant' || entityType === 'processing';
  const isTerminal = entityType === 'export_terminal' || entityType === 'terminal';
  const isField = entityType === 'field';
  const displayName = data.name || data.label || 'Unknown';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-wider text-text-secondary mb-1">
          {isField ? 'Gas Field' : isPlant ? 'Processing Plant' : isTerminal ? 'Export Terminal' : 'Facility'}
        </div>
        <div className="text-lg font-bold text-white">{displayName}</div>
        {data.operator && (
          <div className="text-xs text-teal-dark mt-0.5">{data.operator}</div>
        )}
      </div>

      {/* Key specs */}
      <div className="grid grid-cols-2 gap-3">
        {data.kind && <Stat label="Type" value={data.kind} icon={<Anchor className="w-3.5 h-3.5" />} />}
        {data.phase && <Stat label="Phase" value={data.phase} icon={<TrendingUp className="w-3.5 h-3.5" />} />}
        {data.water_depth != null && <Stat label="Water Depth" value={`${data.water_depth}m`} icon={<Droplets className="w-3.5 h-3.5" />} />}
        {data.main_area && <Stat label="Area" value={data.main_area} icon={<MapPin className="w-3.5 h-3.5" />} />}
        {data.hc_type && <Stat label="HC Type" value={data.hc_type} icon={<Droplets className="w-3.5 h-3.5" />} />}
        {data.status && <Stat label="Status" value={data.status} icon={<TrendingUp className="w-3.5 h-3.5" />} />}
      </div>

      {/* CO2 content for fields */}
      {isField && data.co2_mol_pct != null && (
        <div className="rounded-lg p-3" style={{
          background: `${getCO2Color(data.co2_mol_pct)}08`,
          border: `1px solid ${getCO2Color(data.co2_mol_pct)}25`,
        }}>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-2">CO2 Content</div>
          <div className="flex items-end gap-3">
            <div>
              <div className="text-3xl font-bold font-mono" style={{ color: getCO2Color(data.co2_mol_pct) }}>
                {data.co2_mol_pct.toFixed(1)}
              </div>
              <div className="text-[10px] text-text-secondary">mol%</div>
            </div>
            <div className="flex-1">
              {/* CO2 bar vs 2.5% limit */}
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0, 16, 77, 0.6)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(data.co2_mol_pct / 10 * 100, 100)}%`,
                    background: getCO2Color(data.co2_mol_pct),
                  }}
                />
                {/* 2.5% limit marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-400"
                  style={{ left: '25%' }}
                  title="2.5% Gassled limit"
                />
              </div>
              <div className="flex justify-between text-[8px] text-text-secondary mt-0.5 font-mono">
                <span>0%</span>
                <span className="text-yellow-400">2.5% limit</span>
                <span>10%</span>
              </div>
            </div>
          </div>
          {data.co2_mol_pct > 2.5 && (
            <div className="mt-2 text-[10px] px-2 py-1 rounded" style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b' }}>
              Exceeds pipeline spec — requires CO2 removal or blending
            </div>
          )}
        </div>
      )}

      {/* Processing plant capacity */}
      {isPlant && data.capacity_mscm_d != null && (
        <div className="rounded-lg p-3" style={{ background: 'rgba(0, 212, 170, 0.06)', border: '1px solid rgba(0, 212, 170, 0.15)' }}>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-2">Processing Capacity</div>
          <div className="text-2xl font-bold font-mono text-white">
            {data.capacity_mscm_d} <span className="text-sm text-text-secondary font-normal">MSm³/d</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(0, 16, 77, 0.6)' }}>
            <div className="h-full rounded-full bg-teal-dark" style={{ width: '68%' }} />
          </div>
          <div className="text-[10px] text-text-secondary mt-1">~68% utilization (indicative)</div>

          {data.has_co2_removal && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400 font-medium">CO2 removal capability</span>
            </div>
          )}
        </div>
      )}

      {/* Terminal market info */}
      {isTerminal && (
        <div className="rounded-lg p-3" style={{ background: 'rgba(255, 169, 77, 0.06)', border: '1px solid rgba(255, 169, 77, 0.15)' }}>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-2">Market Connection</div>
          <div className="grid grid-cols-2 gap-3">
            {data.country && (
              <div>
                <div className="text-[10px] text-text-secondary">Country</div>
                <div className="text-sm font-medium text-white">{data.country}</div>
              </div>
            )}
            {data.hub_name && (
              <div>
                <div className="text-[10px] text-text-secondary">Trading Hub</div>
                <div className="text-sm font-medium text-amber-400">{data.hub_name}</div>
              </div>
            )}
            {data.default_price != null && (
              <div>
                <div className="text-[10px] text-text-secondary">Hub Price</div>
                <div className="text-sm font-bold font-mono text-white">
                  {data.default_price} <span className="text-[10px] text-text-secondary">{data.currency}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Belongs to field */}
      {data.belongs_to_name && (
        <div className="text-xs text-text-secondary">
          Part of: <span className="text-teal-dark">{data.belongs_to_name}</span>
        </div>
      )}
    </div>
  );
}

// ─── Stat helper ─────────────────────────────────────────────────────

function Stat({ label, value, icon, color }: { label: string; value: string; icon?: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-lg p-2" style={{ background: 'rgba(184, 255, 225, 0.03)' }}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-text-secondary mb-0.5">
        {icon && <span className="text-text-secondary">{icon}</span>}
        {label}
      </div>
      <div className="text-xs font-medium truncate" style={{ color: color || '#e8edf5' }}>
        {value}
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────

export interface InfraSelection {
  type: 'pipeline' | 'facility' | 'field' | 'processing_plant' | 'export_terminal' | 'processing' | 'terminal';
  data: Record<string, unknown>;
}

interface InfraDetailPanelProps {
  selection: InfraSelection | null;
  onClose: () => void;
}

export function InfraDetailPanel({ selection, onClose }: InfraDetailPanelProps) {
  if (!selection) return null;

  const isPipeline = selection.type === 'pipeline';

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-20 overflow-y-auto"
      style={{
        width: 320,
        background: 'rgba(0, 16, 77, 0.96)',
        borderLeft: '1px solid rgba(184, 255, 225, 0.12)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-none"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>

        {isPipeline ? (
          <PipelineDetail data={selection.data as PipelineData} />
        ) : (
          <FacilityDetail data={selection.data as FacilityData} entityType={selection.type} />
        )}
      </div>
    </div>
  );
}
