import React, { useState, useMemo } from 'react';
import type { Detection, MitreTactic } from './types';

export interface ThreatHeatmapProps {
  detections: Detection[];
  timeRange?: '24h' | '7d' | '30d' | '90d';
  groupBy?: 'hour' | 'day' | 'week';
  onSelectCell?: (timestamp: string, tactic: MitreTactic, detections: Detection[]) => void;
  showLegend?: boolean;
  className?: string;
}

const tacticOrder: MitreTactic[] = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
];

const tacticLabels: Record<MitreTactic, string> = {
  reconnaissance: 'Recon',
  'resource-development': 'Res Dev',
  'initial-access': 'Init Access',
  execution: 'Execution',
  persistence: 'Persist',
  'privilege-escalation': 'Priv Esc',
  'defense-evasion': 'Def Eva',
  'credential-access': 'Cred Acc',
  discovery: 'Discovery',
  'lateral-movement': 'Lat Mov',
  collection: 'Collect',
  'command-and-control': 'C2',
  exfiltration: 'Exfil',
  impact: 'Impact',
};

const getIntensityColor = (count: number, max: number): string => {
  if (count === 0) return 'bg-gray-50';
  const intensity = count / max;
  if (intensity >= 0.8) return 'bg-red-600';
  if (intensity >= 0.6) return 'bg-red-500';
  if (intensity >= 0.4) return 'bg-orange-500';
  if (intensity >= 0.2) return 'bg-yellow-500';
  return 'bg-yellow-300';
};

const getIntensityTextColor = (count: number, max: number): string => {
  if (count === 0) return 'text-gray-400';
  const intensity = count / max;
  if (intensity >= 0.4) return 'text-white';
  return 'text-gray-800';
};

export const ThreatHeatmap: React.FC<ThreatHeatmapProps> = ({
  detections,
  timeRange = '7d',
  groupBy = 'day',
  onSelectCell,
  showLegend = true,
  className = '',
}) => {
  const [selectedCell, setSelectedCell] = useState<{ time: string; tactic: MitreTactic } | null>(
    null
  );
  const [hoveredCell, setHoveredCell] = useState<{
    time: string;
    tactic: MitreTactic;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const now = new Date();
    let count = 0;

    switch (timeRange) {
      case '24h':
        count = groupBy === 'hour' ? 24 : 1;
        break;
      case '7d':
        count = groupBy === 'hour' ? 168 : groupBy === 'day' ? 7 : 1;
        break;
      case '30d':
        count = groupBy === 'hour' ? 720 : groupBy === 'day' ? 30 : 4;
        break;
      case '90d':
        count = groupBy === 'day' ? 90 : groupBy === 'week' ? 13 : 90;
        break;
    }

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      if (groupBy === 'hour') {
        date.setHours(date.getHours() - i);
        slots.push(date.toISOString().slice(0, 13));
      } else if (groupBy === 'day') {
        date.setDate(date.getDate() - i);
        slots.push(date.toISOString().slice(0, 10));
      } else {
        date.setDate(date.getDate() - i * 7);
        slots.push(`W${Math.ceil((date.getDate() + 6) / 7)}`);
      }
    }

    return slots;
  }, [timeRange, groupBy]);

  const heatmapData = useMemo(() => {
    const data: Record<string, Record<MitreTactic, Detection[]>> = {};

    timeSlots.forEach((slot) => {
      data[slot] = {} as Record<MitreTactic, Detection[]>;
      tacticOrder.forEach((tactic) => {
        data[slot][tactic] = [];
      });
    });

    detections.forEach((detection) => {
      const timestamp = new Date(detection.timestamp);
      let slot: string;

      if (groupBy === 'hour') {
        slot = timestamp.toISOString().slice(0, 13);
      } else if (groupBy === 'day') {
        slot = timestamp.toISOString().slice(0, 10);
      } else {
        slot = `W${Math.ceil((timestamp.getDate() + 6) / 7)}`;
      }

      if (data[slot] && data[slot][detection.tactic]) {
        data[slot][detection.tactic].push(detection);
      }
    });

    return data;
  }, [detections, timeSlots, groupBy]);

  const maxCount = useMemo(() => {
    let max = 1;
    Object.values(heatmapData).forEach((tactics) => {
      Object.values(tactics).forEach((dets) => {
        if (dets.length > max) max = dets.length;
      });
    });
    return max;
  }, [heatmapData]);

  const stats = useMemo(() => {
    const bySeverity: Record<string, number> = {};
    const byTactic: Record<MitreTactic, number> = {} as Record<MitreTactic, number>;
    let peakHour = '';
    let peakCount = 0;

    tacticOrder.forEach((tactic) => {
      byTactic[tactic] = 0;
    });

    Object.entries(heatmapData).forEach(([time, tactics]) => {
      let timeTotal = 0;
      Object.entries(tactics).forEach(([tactic, dets]) => {
        byTactic[tactic as MitreTactic] += dets.length;
        timeTotal += dets.length;
        dets.forEach((d) => {
          bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1;
        });
      });
      if (timeTotal > peakCount) {
        peakCount = timeTotal;
        peakHour = time;
      }
    });

    const mostActiveTactic = Object.entries(byTactic).reduce(
      (max, [tactic, count]) => (count > max.count ? { tactic: tactic as MitreTactic, count } : max),
      { tactic: 'reconnaissance' as MitreTactic, count: 0 }
    );

    return {
      total: detections.length,
      bySeverity,
      byTactic,
      peakHour,
      peakCount,
      mostActiveTactic,
    };
  }, [heatmapData, detections]);

  const handleCellClick = (time: string, tactic: MitreTactic) => {
    setSelectedCell({ time, tactic });
    onSelectCell?.(time, tactic, heatmapData[time]?.[tactic] || []);
  };

  const formatTimeLabel = (slot: string): string => {
    if (groupBy === 'hour') {
      const date = new Date(slot);
      return date.toLocaleTimeString('en-US', { hour: 'numeric' });
    }
    if (groupBy === 'day') {
      const date = new Date(slot);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return slot;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} data-testid="threat-heatmap">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Threat Activity Heatmap</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Total: {stats.total}</span>
            <span>Peak: {stats.peakCount} ({stats.peakHour})</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500" />
            <span className="text-sm text-gray-600">
              Critical: {stats.bySeverity.critical || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-orange-500" />
            <span className="text-sm text-gray-600">High: {stats.bySeverity.high || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-sm text-gray-600">Medium: {stats.bySeverity.medium || 0}</span>
          </div>
          <div className="text-sm text-gray-600">
            Most Active: <span className="font-medium">{tacticLabels[stats.mostActiveTactic.tactic]}</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time labels */}
          <div className="flex mb-1 ml-20">
            {timeSlots.map((slot, i) => (
              <div
                key={slot}
                className="flex-1 text-center text-xs text-gray-500 truncate px-0.5"
                style={{ minWidth: '24px', maxWidth: '40px' }}
              >
                {i % Math.ceil(timeSlots.length / 10) === 0 ? formatTimeLabel(slot) : ''}
              </div>
            ))}
          </div>

          {/* Heatmap rows */}
          {tacticOrder.map((tactic) => (
            <div key={tactic} className="flex items-center mb-0.5">
              {/* Tactic label */}
              <div className="w-20 text-xs text-gray-600 truncate pr-2 text-right">
                {tacticLabels[tactic]}
              </div>

              {/* Cells */}
              {timeSlots.map((slot) => {
                const count = heatmapData[slot]?.[tactic]?.length || 0;
                const isSelected =
                  selectedCell?.time === slot && selectedCell?.tactic === tactic;

                return (
                  <div
                    key={`${slot}-${tactic}`}
                    className={`flex-1 h-6 mx-0.5 rounded cursor-pointer transition-all ${getIntensityColor(
                      count,
                      maxCount
                    )} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    style={{ minWidth: '24px', maxWidth: '40px' }}
                    onClick={() => handleCellClick(slot, tactic)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCell({
                        time: slot,
                        tactic,
                        count,
                        x: rect.left,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                    data-testid={`heatmap-cell-${slot}-${tactic}`}
                  >
                    {count > 0 && (
                      <span
                        className={`flex items-center justify-center h-full text-xs font-medium ${getIntensityTextColor(
                          count,
                          maxCount
                        )}`}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Less</span>
            <div className="flex gap-0.5">
              <span className="w-4 h-4 rounded bg-gray-50" />
              <span className="w-4 h-4 rounded bg-yellow-300" />
              <span className="w-4 h-4 rounded bg-yellow-500" />
              <span className="w-4 h-4 rounded bg-orange-500" />
              <span className="w-4 h-4 rounded bg-red-500" />
              <span className="w-4 h-4 rounded bg-red-600" />
            </div>
            <span className="text-xs text-gray-500">More</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 p-2 bg-gray-900 text-white rounded shadow-lg text-xs"
          style={{
            left: hoveredCell.x + 10,
            top: hoveredCell.y - 40,
          }}
        >
          <div className="font-medium">{tacticLabels[hoveredCell.tactic]}</div>
          <div>{formatTimeLabel(hoveredCell.time)}</div>
          <div>{hoveredCell.count} detection(s)</div>
        </div>
      )}
    </div>
  );
};

export default ThreatHeatmap;
