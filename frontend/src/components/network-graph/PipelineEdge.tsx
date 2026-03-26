import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import { getCO2Color } from '@/utils/co2Calculations';

export const PipelineEdge = memo(function PipelineEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
}: EdgeProps) {
  const edgeData = (data ?? {}) as Record<string, unknown>;
  const co2 = edgeData.co2 as number | undefined;
  const diameter = edgeData.diameter as number | undefined;
  const name = edgeData.name as string | undefined;
  const spareCapacity = edgeData.spareCapacity as boolean | undefined;

  const strokeColor = co2 != null ? getCO2Color(co2) : 'rgba(184, 255, 225, 0.3)';
  const strokeWidth = diameter ? Math.max(1.5, Math.min(diameter / 8, 5)) : 2;

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: spareCapacity ? '8 4' : undefined,
        }}
      />
      {/* Animated flow dots */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray="4 8"
        className="animate-flow"
        opacity={0.6}
      />
      {name && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none text-[9px] text-text-secondary bg-surface/80 px-1 rounded"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {name}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
