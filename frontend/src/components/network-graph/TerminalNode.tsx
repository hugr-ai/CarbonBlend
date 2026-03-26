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
  const hub = nodeData.hub as string | undefined;
  const price = nodeData.price as number | undefined;
  const currency = (nodeData.currency as string) ?? 'USD';
  const flag = countryFlag(country);

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-teal !border-navy !w-2 !h-2" />
      <div className="bg-navy-light border border-warning/40 rounded-lg px-3 py-2 min-w-[110px]">
        <div className="flex items-center gap-2">
          <span className="text-lg">{flag}</span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-text-primary leading-tight">
              {nodeData.label}
            </span>
            {hub && (
              <span className="text-[10px] text-warning">{hub}</span>
            )}
          </div>
        </div>
        {price != null && (
          <div className="mt-1 text-[10px] text-text-secondary">
            Price:{' '}
            <span className="font-mono text-text-primary">
              {price.toFixed(2)} {currency}/MWh
            </span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-teal !border-navy !w-2 !h-2" />
    </>
  );
});
