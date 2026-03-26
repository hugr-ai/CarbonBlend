import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Building2, Anchor, Factory, CircleDot } from 'lucide-react';

interface FacilityNodeData {
  label: string;
  kind?: string;
  [key: string]: unknown;
}

const kindIcons: Record<string, typeof Building2> = {
  PLATFORM: Anchor,
  FPSO: CircleDot,
  SUBSEA: CircleDot,
  ONSHORE: Factory,
};

export const FacilityNode = memo(function FacilityNode({ data }: NodeProps) {
  const nodeData = data as FacilityNodeData;
  const kind = (nodeData.kind as string) ?? '';
  const Icon = kindIcons[kind.toUpperCase()] ?? Building2;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-teal !border-navy !w-2 !h-2" />
      <div className="flex items-center gap-2 px-3 py-2 bg-navy-light border border-teal/30 rounded-lg min-w-[90px]">
        <Icon className="w-4 h-4 text-teal shrink-0" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-text-primary leading-tight">
            {nodeData.label}
          </span>
          {kind && (
            <span className="text-[10px] text-text-secondary">{kind}</span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-teal !border-navy !w-2 !h-2" />
    </>
  );
});
