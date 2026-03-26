import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { getCO2Color, formatCO2 } from '@/utils/co2Calculations';

interface FieldNodeData {
  label: string;
  co2?: number | null;
  status?: string;
  selected?: boolean;
  [key: string]: unknown;
}

export const FieldNode = memo(function FieldNode({ data }: NodeProps) {
  const nodeData = data as FieldNodeData;
  const co2 = nodeData.co2 as number | undefined;
  const color = co2 != null ? getCO2Color(co2) : '#555';
  const selected = nodeData.selected as boolean | undefined;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-teal !border-navy !w-2 !h-2" />
      <div
        className={`relative flex flex-col items-center justify-center px-4 py-3 min-w-[100px] text-center transition-shadow ${
          selected ? 'animate-pulse-teal' : ''
        }`}
        style={{
          background: `linear-gradient(135deg, ${color}22, ${color}44)`,
          border: `2px solid ${selected ? '#b8ffe1' : color}`,
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          filter: selected ? `drop-shadow(0 0 8px ${color})` : undefined,
        }}
      >
        <span className="text-xs font-semibold text-white leading-tight">
          {nodeData.label}
        </span>
        {co2 != null && (
          <span className="text-[10px] font-mono mt-0.5" style={{ color }}>
            {formatCO2(co2)}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-teal !border-navy !w-2 !h-2" />
    </>
  );
});
