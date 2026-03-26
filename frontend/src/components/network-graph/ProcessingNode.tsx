import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Cog } from 'lucide-react';

interface ProcessingNodeData {
  label: string;
  capacity?: number;
  used?: number;
  hasCO2Removal?: boolean;
  [key: string]: unknown;
}

export const ProcessingNode = memo(function ProcessingNode({ data }: NodeProps) {
  const nodeData = data as ProcessingNodeData;
  const capacity = nodeData.capacity as number | undefined;
  const used = nodeData.used as number | undefined;
  const hasCO2Removal = nodeData.hasCO2Removal as boolean | undefined;
  const utilization = capacity && used ? (used / capacity) * 100 : 0;
  const barColor = utilization > 90 ? '#ff6b6b' : utilization > 70 ? '#ffa94d' : '#51cf66';

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-teal !border-navy !w-2 !h-2" />
      <div className="bg-surface border border-teal/40 rounded-xl px-4 py-3 min-w-[140px] shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Cog className="w-4 h-4 text-teal" />
          <span className="text-xs font-semibold text-text-primary">
            {nodeData.label}
          </span>
        </div>

        {capacity != null && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-text-secondary">Capacity</span>
              <span className="text-text-primary font-mono">
                {capacity} MSm\u00B3/d
              </span>
            </div>
            <div className="h-1.5 bg-navy rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(utilization, 100)}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
          </div>
        )}

        {hasCO2Removal && (
          <div className="mt-1.5 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-[10px] text-success">CO2 removal</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-teal !border-navy !w-2 !h-2" />
    </>
  );
});
