import { memo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const NetworkLegend = memo(function NetworkLegend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="absolute top-3 right-3 z-10 select-none"
      style={{
        background: 'rgba(10, 22, 40, 0.92)',
        border: '1px solid rgba(184, 255, 225, 0.15)',
        borderRadius: 8,
        padding: collapsed ? '6px 10px' : '10px 14px',
        backdropFilter: 'blur(8px)',
        minWidth: 140,
      }}
    >
      {/* Header */}
      <button
        className="flex items-center justify-between w-full text-[10px] font-semibold text-text-secondary uppercase tracking-wider cursor-pointer bg-transparent border-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>Legend</span>
        {collapsed ? (
          <ChevronDown className="w-3 h-3 text-text-secondary" />
        ) : (
          <ChevronUp className="w-3 h-3 text-text-secondary" />
        )}
      </button>

      {!collapsed && (
        <div className="mt-2 space-y-2.5">
          {/* Node types */}
          <div className="space-y-1.5">
            <div className="text-[9px] text-text-secondary font-semibold uppercase tracking-wider">
              Nodes
            </div>

            {/* Field */}
            <div className="flex items-center gap-2">
              <div
                className="rounded-full shrink-0"
                style={{
                  width: 12,
                  height: 12,
                  background: 'radial-gradient(circle, #51cf66, #51cf6644)',
                  border: '1.5px solid #51cf66',
                }}
              />
              <span className="text-[10px] text-text-primary">Field (CO&#8322; colored)</span>
            </div>

            {/* Hub / Facility */}
            <div className="flex items-center gap-2">
              <div
                className="shrink-0"
                style={{
                  width: 10,
                  height: 10,
                  transform: 'rotate(45deg)',
                  background: '#001a6e',
                  border: '1.5px solid rgba(0, 212, 170, 0.5)',
                  marginLeft: 1,
                  marginRight: 1,
                }}
              />
              <span className="text-[10px] text-text-primary">Hub / Platform</span>
            </div>

            {/* Processing plant */}
            <div className="flex items-center gap-2">
              <div
                className="shrink-0"
                style={{
                  width: 16,
                  height: 10,
                  borderRadius: 3,
                  background: '#001a6e',
                  border: '1.5px solid rgba(0, 212, 170, 0.4)',
                }}
              />
              <span className="text-[10px] text-text-primary">Processing plant</span>
            </div>

            {/* Terminal */}
            <div className="flex items-center gap-2">
              <div
                className="shrink-0"
                style={{
                  width: 16,
                  height: 10,
                  borderRadius: 3,
                  background: '#1a1a2e',
                  border: '1.5px solid rgba(255, 169, 77, 0.45)',
                }}
              />
              <span className="text-[10px] text-text-primary">Export terminal</span>
            </div>
          </div>

          {/* Pipeline types */}
          <div className="space-y-1.5">
            <div className="text-[9px] text-text-secondary font-semibold uppercase tracking-wider">
              Pipelines
            </div>

            {/* Gas */}
            <div className="flex items-center gap-2">
              <div
                className="shrink-0"
                style={{ width: 18, height: 0, borderTop: '2px solid #00d4aa' }}
              />
              <span className="text-[10px] text-text-primary">Gas</span>
            </div>

            {/* Oil */}
            <div className="flex items-center gap-2">
              <div
                className="shrink-0"
                style={{ width: 18, height: 0, borderTop: '2px solid #ffa94d' }}
              />
              <span className="text-[10px] text-text-primary">Oil</span>
            </div>

            {/* Condensate */}
            <div className="flex items-center gap-2">
              <div
                className="shrink-0"
                style={{ width: 18, height: 0, borderTop: '2px solid #ff6b35' }}
              />
              <span className="text-[10px] text-text-primary">Condensate</span>
            </div>

            {/* Spare capacity */}
            <div className="flex items-center gap-2">
              <div
                className="shrink-0"
                style={{ width: 18, height: 0, borderTop: '2px dashed rgba(184, 255, 225, 0.4)' }}
              />
              <span className="text-[10px] text-text-primary">Spare capacity</span>
            </div>
          </div>

          {/* CO2 scale */}
          <div className="space-y-1">
            <div className="text-[9px] text-text-secondary font-semibold uppercase tracking-wider">
              CO&#8322; mol%
            </div>
            <div className="flex items-center gap-1">
              <div
                className="h-1.5 rounded-full flex-1"
                style={{
                  background: 'linear-gradient(to right, #51cf66, #fcc419, #ff6b6b)',
                  minWidth: 60,
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] text-text-secondary font-mono">
              <span>0%</span>
              <span>2.5%</span>
              <span>5%+</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
