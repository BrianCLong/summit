import React from 'react';
import * as d3 from 'd3';

export interface AxisComponentProps {
  scale: d3.AxisScale<any>;
  orientation: 'top' | 'right' | 'bottom' | 'left';
  transform?: string;
  tickFormat?: (value: any) => string;
  ticks?: number;
  tickSize?: number;
  label?: string;
  labelOffset?: number;
}

export function AxisComponent({
  scale,
  orientation,
  transform = '',
  tickFormat,
  ticks = 5,
  tickSize = 6,
  label,
  labelOffset = 40,
}: AxisComponentProps) {
  const axisRef = React.useRef<SVGGElement>(null);

  React.useEffect(() => {
    if (!axisRef.current) return;

    const axisGenerator = {
      top: d3.axisTop,
      right: d3.axisRight,
      bottom: d3.axisBottom,
      left: d3.axisLeft,
    }[orientation](scale);

    axisGenerator.ticks(ticks).tickSize(tickSize);

    if (tickFormat) {
      axisGenerator.tickFormat(tickFormat as any);
    }

    d3.select(axisRef.current).call(axisGenerator as any);
  }, [scale, orientation, ticks, tickSize, tickFormat]);

  const labelTransform = {
    top: `translate(${(scale.range()[1] - scale.range()[0]) / 2}, ${-labelOffset})`,
    right: `translate(${labelOffset}, ${(scale.range()[1] - scale.range()[0]) / 2}) rotate(90)`,
    bottom: `translate(${(scale.range()[1] - scale.range()[0]) / 2}, ${labelOffset})`,
    left: `translate(${-labelOffset}, ${(scale.range()[1] - scale.range()[0]) / 2}) rotate(-90)`,
  }[orientation];

  return (
    <g ref={axisRef} transform={transform} className={`axis axis-${orientation}`}>
      {label && (
        <text
          transform={labelTransform}
          textAnchor="middle"
          fill="currentColor"
          fontSize={12}
          fontWeight={500}
        >
          {label}
        </text>
      )}
    </g>
  );
}
