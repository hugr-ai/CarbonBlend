import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface FacilityNodeData {
  label: string;
  kind?: string;
  operator?: string;
  [key: string]: unknown;
}

const HUB_PLATFORMS = ['DRAUPNER', 'HEIMDAL', 'SLEIPNER'];

export const FacilityNode = memo(function FacilityNode({ data }: NodeProps) {
  const nodeData = data as FacilityNodeData;
  const kind = (nodeData.kind as string) ?? '';
  const operator = (nodeData.operator as string) ?? '';
  const label = nodeData.label ?? '';
  const isHub = HUB_PLATFORMS.some((h) => label.toUpperCase().includes(h));
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex flex-col items-center relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-teal-dark !border-navy !w-2 !h-2"
        style={{ left: -4, top: 18 }}
      />

      {/* Diamond (rotated square) */}
      <div
        className="cursor-pointer transition-all duration-200"
        style={{
          width: 36,
          height: 36,
          transform: 'rotate(45deg)',
          background: '#001a6e',
          border: `2px solid ${isHub ? '#00d4aa' : 'rgba(184, 255, 225, 0.25)'}`,
          boxShadow: hovered
            ? '0 0 12px rgba(0, 212, 170, 0.3)'
            : isHub
            ? '0 0 6px rgba(0, 212, 170, 0.15)'
            : 'none',
        }}
      />

      {/* Label below diamond */}
      <span
        className="text-[10px] font-medium text-text-primary leading-tight text-center mt-2"
        style={{
          maxWidth: 80,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 3px rgba(0,0,0,0.7)',
        }}
      >
        {label}
      </span>

      {/* HUB badge */}
      {isHub && (
        <span
          className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded mt-0.5"
          style={{
            color: '#00d4aa',
            backgroundColor: 'rgba(0, 212, 170, 0.12)',
            border: '1px solid rgba(0, 212, 170, 0.3)',
          }}
        >
          HUB
        </span>
      )}

      {/* Tooltip on hover */}
      {hovered && (kind || operator) && (
        <div
          className="absolute z-50 px-2 py-1.5 rounded text-[10px] pointer-events-none"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background: 'rgba(10, 22, 40, 0.95)',
            border: '1px solid rgba(184, 255, 225, 0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          {kind && <div className="text-text-secondary">{kind}</div>}
          {operator && <div className="text-teal-dark">{operator}</div>}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-teal-dark !border-navy !w-2 !h-2"
        style={{ right: -4, top: 18 }}
      />
    </div>
  );
});
