import React from 'react';

export interface TimelineDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  type?: string;
}

export interface TimelineSeries {
  id: string;
  label: string;
  color: string;
  data: TimelineDataPoint[];
}

export interface TimelineGraphProps {
  series: TimelineSeries[];
  width?: number | string;
  height?: number;
  showLegend?: boolean;
  yAxisLabel?: string;
  onPointClick?: (seriesId: string, point: TimelineDataPoint) => void;
  className?: string;
}

/**
 * TimelineGraph — Temporal data visualization.
 *
 * Renders time-series data with support for multiple series,
 * zoom, brush selection, and annotations.
 * Production implementation uses d3 or visx for rendering.
 */
export const TimelineGraph: React.FC<TimelineGraphProps> = ({
  series,
  width = '100%',
  height = 300,
  showLegend = true,
  yAxisLabel,
  onPointClick,
  className = '',
}) => {
  return (
    <div className={`border border-border-default rounded-lg overflow-hidden bg-bg-primary ${className}`} style={{ width }}>
      {/* Legend */}
      {showLegend && series.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-bg-secondary border-b border-border-default">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-fg-secondary">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
          ))}
          {yAxisLabel && <span className="ml-auto text-2xs text-fg-muted">{yAxisLabel}</span>}
        </div>
      )}

      {/* Chart area */}
      <div style={{ height }} className="flex items-center justify-center text-fg-tertiary text-sm px-4">
        {series.length === 0 ? (
          <p>No timeline data available</p>
        ) : (
          <svg className="w-full h-full" viewBox={`0 0 800 ${height}`} preserveAspectRatio="none">
            {series.map((s) => {
              if (s.data.length === 0) return null;
              const maxVal = Math.max(...series.flatMap((ser) => ser.data.map((d) => d.value)));
              const minVal = Math.min(...series.flatMap((ser) => ser.data.map((d) => d.value)));
              const range = maxVal - minVal || 1;
              const points = s.data.map((d, i) => {
                const x = (i / (s.data.length - 1)) * 780 + 10;
                const y = height - 20 - ((d.value - minVal) / range) * (height - 40);
                return `${x},${y}`;
              }).join(' ');
              return (
                <g key={s.id}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {s.data.map((d, i) => {
                    const x = (i / (s.data.length - 1)) * 780 + 10;
                    const y = height - 20 - ((d.value - minVal) / range) * (height - 40);
                    return (
                      <circle
                        key={i}
                        cx={x} cy={y} r={3}
                        fill={s.color}
                        className="cursor-pointer hover:r-5"
                        onClick={() => onPointClick?.(s.id, d)}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};
