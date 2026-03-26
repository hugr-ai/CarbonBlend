import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ProcessingNodeData {
  label: string;
  capacity?: number;
  used?: number;
  hasCO2Removal?: boolean;
  [key: string]: unknown;
}

export const ProcessingNode = memo(function ProcessingNode({ data }: NodeProps) {
  const nodeData = data as ProcessingNodeData;
  const capacity = (nodeData.capacity ?? nodeData.capacity_mscm_d) as number | undefined;
  const used = nodeData.used as number | undefined;
  const hasCO2Removal = (nodeData.hasCO2Removal ?? nodeData.has_co2_removal) as boolean | undefined;
  const utilization = capacity && used ? (used / capacity) * 100 : 0;
  const barColor = utilization > 90 ? '#ff6b6b' : utilization > 70 ? '#ffa94d' : '#00d4aa';

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-teal-dark !border-navy !w-2 !h-2"
      />

      <div
        style={{
          width: 160,
          minHeight: 60,
          background: 'linear-gradient(180deg, #001a6e 0%, #00104d 100%)',
          border: '2px solid rgba(0, 212, 170, 0.4)',
          borderRadius: 10,
          padding: '10px 14px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Plant name row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Factory icon inline SVG */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00d4aa"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          </svg>
          <span className="text-[12px] font-bold text-text-primary leading-tight truncate">
            {nodeData.label}
          </span>
          {hasCO2Removal && (
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0 ml-auto"
              style={{
                backgroundColor: '#51cf66',
                boxShadow: '0 0 4px rgba(81, 207, 102, 0.5)',
              }}
              title="CO2 removal capable"
            />
          )}
        </div>

        {/* Capacity bar */}
        {capacity != null && (
          <div className="space-y-1">
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0, 16, 77, 0.8)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(utilization, 100)}%`,
                  backgroundColor: barColor,
                  boxShadow: `0 0 4px ${barColor}66`,
                }}
              />
            </div>
            <div className="text-[10px] font-mono text-text-secondary text-right">
              {capacity} MSm\u00B3/d
            </div>
          </div>
        )}

        {hasCO2Removal && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-[9px] text-success font-medium">CO\u2082 removal</span>
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
