import type { Pathway } from '@/types/scenario';
import { getCO2Color } from '@/utils/co2Calculations';

interface PathwayDiagramProps {
  pathway: Pathway;
}

const stepColors: Record<string, string> = {
  removal: '#b8ffe1',
  transport: '#00d4aa',
  blend: '#fcc419',
  storage: '#4a6fa5',
  processing: '#ffa94d',
};

export function PathwayDiagram({ pathway }: PathwayDiagramProps) {
  const steps = pathway.steps;
  const totalWidth = 700;
  const stepWidth = totalWidth / Math.max(steps.length, 1);
  const nodeHeight = 60;
  const yMain = 80;
  const yStorage = 180;

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Pathway: {pathway.name}
      </h3>
      <div className="overflow-x-auto">
        <svg width={totalWidth + 40} height={240} className="mx-auto">
          {/* Main flow line */}
          <line
            x1={20}
            y1={yMain + nodeHeight / 2}
            x2={totalWidth + 20}
            y2={yMain + nodeHeight / 2}
            stroke="rgba(184,255,225,0.2)"
            strokeWidth={2}
          />

          {steps.map((step, i) => {
            const x = 20 + i * stepWidth;
            const color = stepColors[step.type] ?? '#8899bb';
            const co2InColor = getCO2Color(step.co2_in);
            const co2OutColor = getCO2Color(step.co2_out);
            const isStorage = step.type === 'storage';

            return (
              <g key={i}>
                {/* Step node */}
                <rect
                  x={x + 4}
                  y={isStorage ? yStorage : yMain}
                  width={stepWidth - 8}
                  height={nodeHeight}
                  rx={8}
                  fill="rgba(10,22,40,0.9)"
                  stroke={color}
                  strokeWidth={1.5}
                />
                {/* Step type label */}
                <text
                  x={x + stepWidth / 2}
                  y={(isStorage ? yStorage : yMain) + 18}
                  textAnchor="middle"
                  fill={color}
                  fontSize={9}
                  fontWeight={600}
                >
                  {step.type.toUpperCase()}
                </text>
                {/* Location */}
                <text
                  x={x + stepWidth / 2}
                  y={(isStorage ? yStorage : yMain) + 33}
                  textAnchor="middle"
                  fill="#e8edf5"
                  fontSize={10}
                >
                  {step.location.length > 12
                    ? step.location.substring(0, 12) + '...'
                    : step.location}
                </text>
                {/* Cost */}
                <text
                  x={x + stepWidth / 2}
                  y={(isStorage ? yStorage : yMain) + 50}
                  textAnchor="middle"
                  fill="#8899bb"
                  fontSize={9}
                >
                  {step.cost_musd_yr.toFixed(1)} MUSD
                </text>

                {/* CO2 indicators */}
                {!isStorage && (
                  <>
                    <circle
                      cx={x + 10}
                      cy={yMain - 10}
                      r={4}
                      fill={co2InColor}
                    />
                    <text
                      x={x + 18}
                      y={yMain - 7}
                      fill="#8899bb"
                      fontSize={8}
                    >
                      {step.co2_in.toFixed(1)}%
                    </text>
                    <circle
                      cx={x + stepWidth - 10}
                      cy={yMain - 10}
                      r={4}
                      fill={co2OutColor}
                    />
                    <text
                      x={x + stepWidth - 30}
                      y={yMain - 7}
                      fill="#8899bb"
                      fontSize={8}
                    >
                      {step.co2_out.toFixed(1)}%
                    </text>
                  </>
                )}

                {/* Arrow to storage */}
                {isStorage && (
                  <line
                    x1={x + stepWidth / 2}
                    y1={yMain + nodeHeight}
                    x2={x + stepWidth / 2}
                    y2={yStorage}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    markerEnd="url(#arrowhead)"
                  />
                )}

                {/* Flow arrow between main steps */}
                {i < steps.length - 1 && !isStorage && (
                  <polygon
                    points={`${x + stepWidth - 2},${yMain + nodeHeight / 2 - 4} ${x + stepWidth + 6},${yMain + nodeHeight / 2} ${x + stepWidth - 2},${yMain + nodeHeight / 2 + 4}`}
                    fill="rgba(184,255,225,0.4)"
                  />
                )}
              </g>
            );
          })}

          {/* Arrow marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#4a6fa5" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}
