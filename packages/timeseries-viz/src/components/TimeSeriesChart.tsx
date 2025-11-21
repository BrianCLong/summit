import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { TimeSeries, TimeSeriesChartConfig, Annotation, TimeSeriesEventHandlers, TimeRange } from '../types';

export interface TimeSeriesChartProps {
  series: TimeSeries[];
  config?: Partial<TimeSeriesChartConfig>;
  annotations?: Annotation[];
  events?: TimeSeriesEventHandlers;
  className?: string;
}

const defaultConfig: TimeSeriesChartConfig = {
  width: 800,
  height: 400,
  margin: { top: 20, right: 20, bottom: 50, left: 60 },
  showLegend: true,
  showGrid: true,
  showTooltip: true,
  enableBrush: false,
  enableZoom: false,
  animate: true,
  animationDuration: 500,
  dateFormat: '%Y-%m-%d',
  timeFormat: '%H:%M',
  valueFormat: ',.2f',
  interpolation: 'monotone',
};

const CURVE_MAP: Record<string, d3.CurveFactory> = {
  linear: d3.curveLinear,
  step: d3.curveStep,
  stepAfter: d3.curveStepAfter,
  stepBefore: d3.curveStepBefore,
  natural: d3.curveNatural,
  monotone: d3.curveMonotoneX,
};

const DEFAULT_COLORS = [
  '#1976d2', '#dc004e', '#9c27b0', '#f57c00',
  '#388e3c', '#00796b', '#5d4037', '#455a64',
];

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  series,
  config = {},
  annotations = [],
  events = {},
  className,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const cfg = useMemo(() => ({
    ...defaultConfig,
    ...config,
    margin: { ...defaultConfig.margin, ...config.margin },
  }), [config]);

  const innerWidth = cfg.width - cfg.margin.left - cfg.margin.right;
  const innerHeight = cfg.height - cfg.margin.top - cfg.margin.bottom;

  useEffect(() => {
    if (!svgRef.current || series.length === 0) return;

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Parse all timestamps
    const allData = series.flatMap(s =>
      s.data.map(d => ({
        ...d,
        timestamp: d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp),
        seriesId: s.id,
        seriesName: s.name,
        seriesColor: s.color,
      }))
    );

    if (allData.length === 0) return;

    // Create scales
    const xExtent = d3.extent(allData, d => d.timestamp) as [Date, Date];
    const xScale = d3.scaleTime()
      .domain(xExtent)
      .range([0, innerWidth]);

    const yMax = d3.max(allData, d => d.value) || 0;
    const yMin = d3.min(allData, d => d.value) || 0;
    const yPadding = (yMax - yMin) * 0.1;
    const yScale = d3.scaleLinear()
      .domain([Math.min(0, yMin - yPadding), yMax + yPadding])
      .range([innerHeight, 0])
      .nice();

    // Color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(series.map(s => s.id))
      .range(series.map((s, i) => s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]));

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${cfg.margin.left},${cfg.margin.top})`);

    // Add grid
    if (cfg.showGrid) {
      // Horizontal grid
      g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => ''))
        .style('stroke', '#e0e0e0')
        .style('stroke-opacity', 0.5)
        .selectAll('.domain')
        .remove();

      // Vertical grid
      g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat(() => ''))
        .style('stroke', '#e0e0e0')
        .style('stroke-opacity', 0.5)
        .selectAll('.domain')
        .remove();
    }

    // Add X axis
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat(cfg.dateFormat) as any))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // Add Y axis
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale).tickFormat(d3.format(cfg.valueFormat)));

    // Create line/area generators
    const curve = CURVE_MAP[cfg.interpolation] || d3.curveMonotoneX;

    const lineGenerator = d3.line<any>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(curve);

    const areaGenerator = d3.area<any>()
      .x(d => xScale(d.timestamp))
      .y0(innerHeight)
      .y1(d => yScale(d.value))
      .curve(curve);

    // Draw each series
    series.forEach((s, seriesIndex) => {
      const seriesData = s.data.map(d => ({
        ...d,
        timestamp: d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp),
      })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const color = colorScale(s.id);

      if (s.type === 'area') {
        // Area chart
        const area = g.append('path')
          .datum(seriesData)
          .attr('class', `area series-${seriesIndex}`)
          .attr('fill', color)
          .attr('fill-opacity', 0.2)
          .attr('d', areaGenerator);

        if (cfg.animate) {
          area
            .style('opacity', 0)
            .transition()
            .duration(cfg.animationDuration)
            .style('opacity', 1);
        }
      }

      if (s.type === 'line' || s.type === 'area') {
        // Line
        const line = g.append('path')
          .datum(seriesData)
          .attr('class', `line series-${seriesIndex}`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('d', lineGenerator);

        if (cfg.animate) {
          const totalLength = line.node()?.getTotalLength() || 0;
          line
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(cfg.animationDuration)
            .attr('stroke-dashoffset', 0);
        }
      }

      if (s.type === 'bar') {
        // Bar chart
        const barWidth = innerWidth / seriesData.length * 0.8;
        g.selectAll(`.bar-${seriesIndex}`)
          .data(seriesData)
          .enter()
          .append('rect')
          .attr('class', `bar series-${seriesIndex}`)
          .attr('x', d => xScale(d.timestamp) - barWidth / 2)
          .attr('width', barWidth)
          .attr('y', innerHeight)
          .attr('height', 0)
          .attr('fill', color)
          .transition()
          .duration(cfg.animate ? cfg.animationDuration : 0)
          .attr('y', d => yScale(d.value))
          .attr('height', d => innerHeight - yScale(d.value));
      }

      if (s.type === 'scatter' || s.type === 'line' || s.type === 'area') {
        // Points
        const points = g.selectAll(`.point-${seriesIndex}`)
          .data(seriesData)
          .enter()
          .append('circle')
          .attr('class', `point series-${seriesIndex}`)
          .attr('cx', d => xScale(d.timestamp))
          .attr('cy', d => yScale(d.value))
          .attr('r', 0)
          .attr('fill', color)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .style('cursor', 'pointer');

        if (cfg.animate) {
          points
            .transition()
            .duration(cfg.animationDuration)
            .delay((d, i) => i * 10)
            .attr('r', 4);
        } else {
          points.attr('r', 4);
        }

        // Point interactivity
        points
          .on('mouseover', function(event, d) {
            d3.select(this).attr('r', 6);
            if (cfg.showTooltip && tooltipRef.current) {
              const tooltip = d3.select(tooltipRef.current);
              tooltip
                .style('visibility', 'visible')
                .html(`
                  <strong>${s.name}</strong><br/>
                  ${d3.timeFormat(cfg.dateFormat + ' ' + cfg.timeFormat)(d.timestamp)}<br/>
                  Value: ${d3.format(cfg.valueFormat)(d.value)}
                `)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 10}px`);
            }
          })
          .on('mouseout', function() {
            d3.select(this).attr('r', 4);
            if (tooltipRef.current) {
              d3.select(tooltipRef.current).style('visibility', 'hidden');
            }
          })
          .on('click', function(event, d) {
            if (events.onDataPointClick) {
              events.onDataPointClick(d, s);
            }
          });
      }
    });

    // Draw annotations
    annotations.forEach(annotation => {
      const timestamp = annotation.timestamp instanceof Date
        ? annotation.timestamp
        : new Date(annotation.timestamp);
      const x = xScale(timestamp);

      if (annotation.type === 'point' || annotation.type === 'threshold') {
        // Vertical line
        g.append('line')
          .attr('class', 'annotation')
          .attr('x1', x)
          .attr('x2', x)
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', annotation.color || '#ff5722')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,4')
          .style('cursor', 'pointer')
          .on('click', () => events.onAnnotationClick?.(annotation));

        // Label
        g.append('text')
          .attr('x', x)
          .attr('y', -5)
          .attr('text-anchor', 'middle')
          .attr('fill', annotation.color || '#ff5722')
          .attr('font-size', 10)
          .text(annotation.label);
      }

      if (annotation.type === 'range' && annotation.endTimestamp) {
        const endTimestamp = annotation.endTimestamp instanceof Date
          ? annotation.endTimestamp
          : new Date(annotation.endTimestamp);
        const x2 = xScale(endTimestamp);

        g.append('rect')
          .attr('class', 'annotation-range')
          .attr('x', x)
          .attr('y', 0)
          .attr('width', x2 - x)
          .attr('height', innerHeight)
          .attr('fill', annotation.color || '#ff5722')
          .attr('fill-opacity', 0.1)
          .style('cursor', 'pointer')
          .on('click', () => events.onAnnotationClick?.(annotation));
      }
    });

    // Add legend
    if (cfg.showLegend && series.length > 1) {
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${cfg.margin.left + 10},${cfg.margin.top})`);

      series.forEach((s, i) => {
        const legendItem = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);

        legendItem.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', colorScale(s.id));

        legendItem.append('text')
          .attr('x', 18)
          .attr('y', 10)
          .attr('font-size', 12)
          .text(s.name);
      });
    }

    // Brush functionality
    if (cfg.enableBrush) {
      const brush = d3.brushX()
        .extent([[0, 0], [innerWidth, innerHeight]])
        .on('end', (event) => {
          if (event.selection) {
            const [x0, x1] = event.selection as [number, number];
            const range: TimeRange = {
              start: xScale.invert(x0),
              end: xScale.invert(x1),
            };
            events.onBrush?.(range);
          } else {
            events.onBrush?.(null);
          }
        });

      g.append('g')
        .attr('class', 'brush')
        .call(brush);
    }

  }, [series, cfg, annotations, events, innerWidth, innerHeight]);

  return (
    <div className={className} style={{ position: 'relative' }}>
      <svg ref={svgRef} width={cfg.width} height={cfg.height} />
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          visibility: 'hidden',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      />
    </div>
  );
};

export default TimeSeriesChart;
