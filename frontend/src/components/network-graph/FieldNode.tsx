import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { getCO2Color, formatCO2 } from '@/utils/co2Calculations';

interface FieldNodeData {
  label: string;
  co2?: number | null;
  status?: string;
  selected?: boolean;
  npdid?: number;
  [key: string]: unknown;
}

export const FieldNode = memo(function FieldNode({ data }: NodeProps) {
  const nodeData = data as FieldNodeData;
  const co2 = nodeData.co2 as number | undefined;
  const color = co2 != null ? getCO2Color(co2) : '#4a6fa5';
  const selected = nodeData.selected as boolean | undefined;
  const size = selected ? 60 : 46;

  return (
    <div className="flex flex-col items-center" style={{ width: size + 30, position: 'relative' }}>
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-teal-dark !border-navy !w-2 !h-2"
        style={{ left: -4, top: size / 2 + (selected ? 0 : 0) }}
      />

      {/* Outer pulsing ring when selected */}
      {selected && (
        <div
          className="absolute rounded-full animate-field-pulse"
          style={{
            width: size + 12,
            height: size + 12,
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            border: '2px solid rgba(0, 212, 170, 0.5)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main circle */}
      <div
        className="rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}66 60%, ${color}33)`,
          border: `2px solid ${selected ? '#b8ffe1' : color}`,
          boxShadow: selected
            ? `0 0 16px ${color}88, 0 0 32px ${color}44`
            : `0 0 6px ${color}33`,
        }}
      />

      {/* Label below circle */}
      <span
        className="text-[11px] font-semibold text-white leading-tight text-center mt-1.5"
        style={{
          maxWidth: 90,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 3px rgba(0,0,0,0.7)',
        }}
      >
        {nodeData.label}
      </span>

      {/* CO2 badge pill */}
      {co2 != null && (
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded-full mt-0.5"
          style={{
            color,
            backgroundColor: `${color}18`,
            border: `1px solid ${color}33`,
          }}
        >
          {formatCO2(co2)}
        </span>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-teal-dark !border-navy !w-2 !h-2"
        style={{ right: -4, top: size / 2 }}
      />
    </div>
  );
});
