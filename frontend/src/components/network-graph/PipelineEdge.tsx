import { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

/** Color by medium type */
function getMediumColor(medium?: string): string {
  if (!medium) return 'rgba(184, 255, 225, 0.3)';
  switch (medium.toUpperCase()) {
    case 'GAS':
    case 'RICH GAS':
    case 'DRY GAS':
      return '#00d4aa';
    case 'OIL':
      return '#ffa94d';
    case 'CONDENSATE':
      return '#ff6b35';
    default:
      return 'rgba(184, 255, 225, 0.3)';
  }
}

export const PipelineEdge = memo(function PipelineEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps) {
  const edgeData = (data ?? {}) as Record<string, unknown>;
  const medium = edgeData.medium as string | undefined;
  const diameter = edgeData.diameter as number | undefined;
  const name = edgeData.name as string | undefined;
  const spareCapacity = edgeData.spareCapacity as boolean | undefined;
  const co2Limit = edgeData.co2Limit as number | undefined;
  const tariff = edgeData.tariff as number | undefined;

  const [hovered, setHovered] = useState(false);

  const strokeColor = getMediumColor(medium);
  const strokeWidth = diameter
    ? Math.max(1.5, Math.min(diameter / 10, 6))
    : 2;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      {/* Invisible wide hover target */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth + 10, 14)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      {/* Main pipeline line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: hovered ? strokeWidth + 1 : strokeWidth,
          strokeDasharray: spareCapacity ? '8 4' : undefined,
          opacity: hovered ? 1 : 0.8,
          transition: 'stroke-width 0.2s, opacity 0.2s',
        }}
      />

      {/* Animated flow dots */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={Math.max(strokeWidth * 0.6, 1)}
        strokeDasharray="3 9"
        className="animate-flow"
        opacity={0.5}
        style={{ pointerEvents: 'none' }}
      />

      <EdgeLabelRenderer>
        {/* Pipeline name label */}
        {name && (
          <div
            className="absolute pointer-events-none text-[9px] text-text-secondary px-1 rounded"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: 'rgba(10, 22, 40, 0.75)',
            }}
          >
            {name}
          </div>
        )}

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute z-50 px-2.5 py-2 rounded text-[10px] pointer-events-none"
            style={{
              transform: `translate(-50%, -120%) translate(${labelX}px, ${labelY}px)`,
              background: 'rgba(10, 22, 40, 0.95)',
              border: '1px solid rgba(184, 255, 225, 0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            {name && <div className="text-text-primary font-semibold mb-1">{name}</div>}
            <div className="space-y-0.5">
              {diameter != null && (
                <div>
                  <span className="text-text-secondary">Diameter: </span>
                  <span className="text-text-primary font-mono">{diameter}&quot;</span>
                </div>
              )}
              {medium && (
                <div>
                  <span className="text-text-secondary">Medium: </span>
                  <span style={{ color: strokeColor }}>{medium}</span>
                </div>
              )}
              {co2Limit != null && (
                <div>
                  <span className="text-text-secondary">CO&#8322; limit: </span>
                  <span className="text-text-primary font-mono">{co2Limit} mol%</span>
                </div>
              )}
              {tariff != null && (
                <div>
                  <span className="text-text-secondary">Tariff: </span>
                  <span className="text-text-primary font-mono">{tariff} NOK/Sm&#179;</span>
                </div>
              )}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
});
