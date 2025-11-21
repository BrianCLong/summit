import React from 'react';

export interface GridComponentProps {
  width: number;
  height: number;
  xScale?: any;
  yScale?: any;
  xTicks?: number;
  yTicks?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export function GridComponent({
  width,
  height,
  xScale,
  yScale,
  xTicks = 5,
  yTicks = 5,
  strokeColor = '#e5e7eb',
  strokeWidth = 1,
  strokeDasharray = '2,2',
}: GridComponentProps) {
  const xLines = xScale ? xScale.ticks(xTicks) : [];
  const yLines = yScale ? yScale.ticks(yTicks) : [];

  return (
    <g className="grid">
      {/* Horizontal grid lines */}
      {yLines.map((tick: number, i: number) => (
        <line
          key={`y-${i}`}
          x1={0}
          x2={width}
          y1={yScale(tick)}
          y2={yScale(tick)}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      ))}
      {/* Vertical grid lines */}
      {xLines.map((tick: number, i: number) => (
        <line
          key={`x-${i}`}
          x1={xScale(tick)}
          x2={xScale(tick)}
          y1={0}
          y2={height}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      ))}
    </g>
  );
}
