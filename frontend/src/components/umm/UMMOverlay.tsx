import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUMMEvents, getUMMCapacityStatus } from '@/api/client';
import type { UMMEvent, UMMCapacityStatus } from '@/api/client';
import { AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  green: { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  amber: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  red: { bg: 'bg-danger/10', text: 'text-danger', dot: 'bg-danger' },
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  green: CheckCircle2,
  amber: AlertTriangle,
  red: XCircle,
};

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  planned_maintenance: { label: 'Planned', color: 'text-info' },
  unplanned_outage: { label: 'Unplanned', color: 'text-danger' },
  capacity_reduction: { label: 'Reduced', color: 'text-warning' },
  restart: { label: 'Restart', color: 'text-success' },
  other: { label: 'Other', color: 'text-text-secondary' },
};

interface UMMOverlayProps {
  variant?: 'panel' | 'compact';
}

export function UMMOverlay({ variant = 'panel' }: UMMOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

  const { data: capacityStatus, isLoading: statusLoading } = useQuery<UMMCapacityStatus[]>({
    queryKey: ['umm-capacity-status'],
    queryFn: getUMMCapacityStatus,
    staleTime: 60000,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const { data: events } = useQuery<UMMEvent[]>({
    queryKey: ['umm-events'],
    queryFn: getUMMEvents,
    staleTime: 60000,
    refetchInterval: 300000,
  });

  const activeCount = capacityStatus?.filter((s) => s.has_active_event).length ?? 0;
  const redCount = capacityStatus?.filter((s) => s.status === 'red').length ?? 0;
  const amberCount = capacityStatus?.filter((s) => s.status === 'amber').length ?? 0;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Radio className="w-3.5 h-3.5 text-teal" />
        <span className="text-[10px] text-text-secondary">UMM:</span>
        {redCount > 0 && (
          <span className="text-[10px] text-danger font-medium">{redCount} red</span>
        )}
        {amberCount > 0 && (
          <span className="text-[10px] text-warning font-medium">{amberCount} amber</span>
        )}
        {redCount === 0 && amberCount === 0 && (
          <span className="text-[10px] text-success font-medium">All clear</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-teal" />
          <h3 className="text-sm font-semibold text-text-primary">
            UMM Feed
          </h3>
          {activeCount > 0 && (
            <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-medium">
              {activeCount} active
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Status summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-success/5 border border-success/20 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-success">
                {capacityStatus?.filter((s) => s.status === 'green').length ?? 0}
              </p>
              <p className="text-[10px] text-success/80">Normal</p>
            </div>
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-warning">{amberCount}</p>
              <p className="text-[10px] text-warning/80">Reduced</p>
            </div>
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-2 text-center">
              <p className="text-lg font-semibold text-danger">{redCount}</p>
              <p className="text-[10px] text-danger/80">Unavailable</p>
            </div>
          </div>

          {/* Facility status list */}
          {statusLoading ? (
            <p className="text-xs text-text-secondary text-center py-2">Loading...</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {capacityStatus
                ?.sort((a, b) => {
                  const order = { red: 0, amber: 1, green: 2 };
                  return (order[a.status] ?? 2) - (order[b.status] ?? 2);
                })
                .map((status) => {
                  const colors = statusColors[status.status] ?? statusColors.green;
                  const Icon = statusIcons[status.status] ?? CheckCircle2;
                  const isSelected = selectedFacility === status.facility;

                  return (
                    <div key={status.facility}>
                      <button
                        onClick={() => setSelectedFacility(isSelected ? null : status.facility)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isSelected ? colors.bg : 'hover:bg-navy/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          <span className="text-xs text-text-primary font-medium">
                            {status.facility}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {status.total_capacity_impact_pct != null && (
                            <span className={`text-[10px] font-mono ${colors.text}`}>
                              -{status.total_capacity_impact_pct}%
                            </span>
                          )}
                          <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                        </div>
                      </button>

                      {/* Event details */}
                      {isSelected && status.active_reductions.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1 mb-2">
                          {status.active_reductions.map((evt, i) => {
                            const evtType = eventTypeLabels[evt.event_type] ?? eventTypeLabels.other;
                            return (
                              <div
                                key={i}
                                className="bg-navy rounded-lg p-2 text-xs"
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={`text-[10px] font-medium ${evtType.color}`}>
                                    {evtType.label}
                                  </span>
                                  <span className="text-text-secondary">|</span>
                                  <span className="text-text-secondary text-[10px]">
                                    {evt.start_date && formatDate(evt.start_date)}
                                    {evt.end_date && ` - ${formatDate(evt.end_date)}`}
                                  </span>
                                </div>
                                <p className="text-text-primary text-[11px] leading-relaxed">
                                  {evt.title}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Recent events timeline */}
          {events && events.length > 0 && (
            <div className="border-t border-border pt-3">
              <h4 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Event Timeline
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {events.slice(0, 8).map((evt, i) => {
                  const evtType = eventTypeLabels[evt.event_type] ?? eventTypeLabels.other;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs"
                    >
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-teal/40 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-medium ${evtType.color}`}>
                            {evtType.label}
                          </span>
                          {evt.facility && (
                            <span className="text-text-primary font-medium">{evt.facility}</span>
                          )}
                        </div>
                        <p className="text-text-secondary text-[10px] truncate">
                          {evt.title}
                        </p>
                        {evt.start_date && (
                          <span className="text-[9px] text-text-secondary/60">
                            {formatDate(evt.start_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
