import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { countryFlag } from '@/utils/formatters';

interface TerminalNodeData {
  label: string;
  country?: string;
  hub?: string;
  price?: number;
  currency?: string;
  [key: string]: unknown;
}

export const TerminalNode = memo(function TerminalNode({ data }: NodeProps) {
  const nodeData = data as TerminalNodeData;
  const country = (nodeData.country as string) ?? '';
  const hub = (nodeData.hub ?? nodeData.hub_name) as string | undefined;
  const price = (nodeData.price ?? nodeData.default_price) as number | undefined;
  const currency = (nodeData.currency as string) ?? '';
  const flag = countryFlag(country);

  // Build the info line: "hub | price currency"
  const infoParts: string[] = [];
  if (hub) infoParts.push(hub);
  if (price != null) {
    infoParts.push(`${price.toFixed(1)} ${currency || 'p/th'}`);
  }
  const infoLine = infoParts.join(' | ');

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-teal-dark !border-navy !w-2 !h-2"
      />

      <div
        style={{
          width: 150,
          minHeight: 46,
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0a1628 100%)',
          border: '2px solid rgba(255, 169, 77, 0.45)',
          borderRadius: 8,
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(255, 169, 77, 0.1)',
        }}
      >
        {/* Top row: flag + name */}
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{flag}</span>
          <span className="text-[11px] font-semibold text-text-primary leading-tight truncate">
            {nodeData.label}
          </span>
        </div>

        {/* Info line */}
        {infoLine && (
          <div
            className="text-[10px] font-mono mt-1 truncate"
            style={{ color: '#ffa94d' }}
          >
            {infoLine}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-teal-dark !border-navy !w-2 !h-2"
      />
    </div>
  );
});
