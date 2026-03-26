import { ArrowRightLeft, TrendingDown, Clock, DollarSign, ShieldCheck } from 'lucide-react';
import { formatCost } from '@/utils/formatters';
import type { BridgeOpportunity } from '@/types/scenario';

interface BridgeCardProps {
  bridge: BridgeOpportunity;
  index: number;
}

const typeIcons: Record<string, typeof ArrowRightLeft> = {
  'pipeline_tieback': ArrowRightLeft,
  'compression_upgrade': TrendingDown,
  'processing_addition': ShieldCheck,
};

const riskBadge: Record<string, string> = {
  low: 'bg-success/20 text-success',
  medium: 'bg-warning/20 text-warning',
  high: 'bg-danger/20 text-danger',
};

export function BridgeCard({ bridge, index }: BridgeCardProps) {
  const Icon = typeIcons[bridge.type] ?? ArrowRightLeft;

  return (
    <div className="bg-navy border border-border rounded-xl p-4 hover:border-teal/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-teal" />
          </div>
          <div>
            <span className="text-xs font-semibold text-text-primary">
              Bridge #{index + 1}
            </span>
            <p className="text-[10px] text-text-secondary capitalize">
              {bridge.type.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            riskBadge[bridge.risk_rating] ?? riskBadge.medium
          }`}
        >
          {bridge.risk_rating} risk
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary mb-3 leading-relaxed">
        {bridge.description}
      </p>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface/50 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <DollarSign className="w-3 h-3 text-text-secondary" />
            <span className="text-[10px] text-text-secondary">CAPEX</span>
          </div>
          <p className="text-xs font-mono font-semibold text-text-primary">
            {formatCost(bridge.capex_musd)}
          </p>
        </div>
        <div className="bg-surface/50 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingDown className="w-3 h-3 text-success" />
            <span className="text-[10px] text-text-secondary">Annual Savings</span>
          </div>
          <p className="text-xs font-mono font-semibold text-success">
            {formatCost(bridge.annual_savings_musd)}
          </p>
        </div>
        <div className="bg-surface/50 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-warning" />
            <span className="text-[10px] text-text-secondary">Payback</span>
          </div>
          <p className="text-xs font-mono font-semibold text-warning">
            {bridge.payback_years.toFixed(1)} yrs
          </p>
        </div>
        <div className="bg-surface/50 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-0.5">
            <DollarSign className="w-3 h-3 text-teal" />
            <span className="text-[10px] text-text-secondary">NPV</span>
          </div>
          <p className="text-xs font-mono font-semibold text-teal">
            {formatCost(bridge.npv_musd)}
          </p>
        </div>
      </div>
    </div>
  );
}
