import React from 'react';

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface RiskHeatmapProps {
  cells: HeatmapCell[];
  xLabels: string[];
  yLabels: string[];
  xAxisTitle?: string;
  yAxisTitle?: string;
  minValue?: number;
  maxValue?: number;
  colorScale?: 'risk' | 'sequential' | 'divergent';
  onCellClick?: (cell: HeatmapCell) => void;
  width?: number | string;
  height?: number;
  className?: string;
}

/**
 * RiskHeatmap — Matrix-based risk visualization.
 *
 * Renders probability vs impact or any 2D risk matrix.
 * Production implementation uses d3 scales for color interpolation.
 */
export const RiskHeatmap: React.FC<RiskHeatmapProps> = ({
  cells,
  xLabels,
  yLabels,
  xAxisTitle,
  yAxisTitle,
  minValue = 0,
  maxValue = 100,
  colorScale = 'risk',
  onCellClick,
  width = '100%',
  height = 400,
  className = '',
}) => {
  const getColor = (value: number): string => {
    const normalized = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue || 1)));

    if (colorScale === 'risk') {
      if (normalized > 0.75) return 'rgba(248, 81, 73, 0.8)';   // Red
      if (normalized > 0.5) return 'rgba(210, 153, 34, 0.8)';   // Orange
      if (normalized > 0.25) return 'rgba(88, 166, 255, 0.5)';  // Blue
      return 'rgba(40, 167, 69, 0.3)';                          // Green
    }

    // Sequential: brand-primary opacity
    return `rgba(91, 156, 255, ${0.1 + normalized * 0.7})`;
  };

  const cellWidth = xLabels.length > 0 ? 100 / xLabels.length : 100;
  const cellHeight = yLabels.length > 0 ? 100 / yLabels.length : 100;

  return (
    <div className={`border border-border-default rounded-lg overflow-hidden bg-bg-primary ${className}`} style={{ width }}>
      <div className="p-4" style={{ height }}>
        <div className="flex h-full">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-around pr-2 shrink-0" style={{ width: '80px' }}>
            {yAxisTitle && <div className="text-2xs text-fg-muted -rotate-90 whitespace-nowrap origin-center">{yAxisTitle}</div>}
            {yLabels.map((label) => (
              <div key={label} className="text-xs text-fg-secondary text-right truncate">{label}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 grid" style={{
              gridTemplateColumns: `repeat(${xLabels.length}, 1fr)`,
              gridTemplateRows: `repeat(${yLabels.length}, 1fr)`,
              gap: '2px',
            }}>
              {yLabels.map((yLabel) =>
                xLabels.map((xLabel) => {
                  const cell = cells.find((c) => c.x === xLabel && c.y === yLabel);
                  const value = cell?.value ?? 0;
                  return (
                    <button
                      key={`${xLabel}-${yLabel}`}
                      onClick={() => cell && onCellClick?.(cell)}
                      className="rounded transition-all hover:ring-2 hover:ring-brand-primary/40 flex items-center justify-center"
                      style={{ backgroundColor: getColor(value) }}
                      title={`${xLabel} × ${yLabel}: ${value}`}
                    >
                      <span className="text-2xs font-mono text-fg-primary font-semibold">
                        {cell?.label ?? (value > 0 ? value.toFixed(0) : '')}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-around pt-2">
              {xLabels.map((label) => (
                <div key={label} className="text-xs text-fg-secondary text-center truncate flex-1">{label}</div>
              ))}
            </div>
            {xAxisTitle && <div className="text-2xs text-fg-muted text-center mt-1">{xAxisTitle}</div>}
          </div>
        </div>
      </div>

      {/* Color scale legend */}
      <div className="px-4 py-2 border-t border-border-default flex items-center justify-between">
        <span className="text-2xs text-fg-muted">Low</span>
        <div className="flex-1 mx-4 h-2 rounded-full overflow-hidden bg-gradient-to-r from-green-500/30 via-blue-500/50 via-yellow-500/80 to-red-500/80" />
        <span className="text-2xs text-fg-muted">High</span>
      </div>
    </div>
  );
};
