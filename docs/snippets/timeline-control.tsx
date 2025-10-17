import { useMemo } from 'react';
import { scaleLinear } from '@visx/scale';
import { Brush } from '@visx/brush';
import { LinePath } from '@visx/shape';
import { Group } from '@visx/group';
import { localPoint } from '@visx/event';

export type TimeSeriesPoint = {
  ts: number;
  value: number;
};

export type TimelineControlProps = {
  width: number;
  height: number;
  series: TimeSeriesPoint[];
  window: [number, number];
  onWindowChange: (window: [number, number]) => void;
};

export function TimelineControl({ width, height, series, window, onWindowChange }: TimelineControlProps) {
  const padding = 16;
  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [Math.min(...series.map((d) => d.ts)), Math.max(...series.map((d) => d.ts))],
        range: [padding, width - padding]
      }),
    [series, width]
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        domain: [0, Math.max(...series.map((d) => d.value || 0)) || 1],
        range: [height - padding, padding]
      }),
    [series, height]
  );

  const handleBrushChange = (domain: { x0: number; x1: number } | null) => {
    if (!domain) return;
    const next: [number, number] = [xScale.invert(domain.x0), xScale.invert(domain.x1)];
    onWindowChange(next);
  };

  const initialBrushPosition = useMemo(() => {
    return {
      start: { x: xScale(window[0]), y: padding },
      end: { x: xScale(window[1]), y: height - padding }
    };
  }, [window, xScale, height]);

  return (
    <svg width={width} height={height} role="img" aria-label="Timeline control">
      <Group>
        <LinePath
          data={series}
          x={(d) => xScale(d.ts)}
          y={(d) => yScale(d.value)}
          stroke="#2563eb"
          strokeWidth={2}
          curve={null}
        />
        <Brush
          width={width - padding * 2}
          height={height - padding * 2}
          margin={{ top: padding, left: padding, bottom: padding, right: padding }}
          resizeTriggerAreas={['left', 'right']}
          selectedBoxStyle={{ fill: '#2563eb33', stroke: '#2563eb' }}
          handleSize={8}
          initialBrushPosition={initialBrushPosition}
          onChange={handleBrushChange}
          onMouseMove={(brush) => {
            const point = localPoint(brush.event);
            if (point) {
              brush.updateBrush((prev) => ({
                ...prev,
                extent: {
                  x0: Math.min(point.x, prev.extent.x0),
                  x1: Math.max(point.x, prev.extent.x1),
                  y0: prev.extent.y0,
                  y1: prev.extent.y1
                }
              }));
            }
          }}
        />
      </Group>
    </svg>
  );
}
