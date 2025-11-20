import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type {
  DataPoint,
  LineChartConfig,
  ChartEventHandlers,
  ChartRef,
} from '../types';
import { createLinearScale, createBandScale, createTimeScale } from '../utils/scales';
import { createXAxis, createYAxis, createGridLines } from '../utils/axes';
import { createTooltip, showTooltip, hideTooltip, formatTooltipContent } from '../utils/tooltip';

export interface LineChartProps {
  data: DataPoint[];
  config?: Partial<LineChartConfig>;
  events?: ChartEventHandlers;
  chartRef?: React.Ref<ChartRef>;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  config = {},
  events = {},
  chartRef,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: config.width || 800, height: config.height || 400 });

  // Parse config with defaults
  const cfg: LineChartConfig = {
    width: dimensions.width,
    height: dimensions.height,
    margin: { top: 20, right: 20, bottom: 30, left: 40, ...config.margin },
    theme: {
      backgroundColor: '#ffffff',
      textColor: '#333333',
      gridColor: '#e0e0e0',
      accentColor: '#1976d2',
      colors: ['#1976d2', '#dc004e', '#9c27b0', '#f57c00'],
      fontSize: 12,
      fontFamily: 'sans-serif',
      ...config.theme,
    },
    responsive: config.responsive ?? true,
    animation: { enabled: true, duration: 750, easing: 'ease-in-out', ...config.animation },
    tooltip: { enabled: true, ...config.tooltip },
    legend: { show: true, position: 'right', orientation: 'vertical', ...config.legend },
    xAxis: { showGrid: true, showAxis: true, ...config.xAxis },
    yAxis: { showGrid: true, showAxis: true, ...config.yAxis },
    showPoints: config.showPoints ?? true,
    pointRadius: config.pointRadius || 4,
    lineWidth: config.lineWidth || 2,
    curved: config.curved ?? true,
    fillArea: config.fillArea ?? false,
    fillOpacity: config.fillOpacity || 0.1,
    title: config.title,
    subtitle: config.subtitle,
  };

  // Handle responsive resize
  useEffect(() => {
    if (!cfg.responsive || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height: height || cfg.height });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [cfg.responsive, cfg.height]);

  // Render chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Calculate inner dimensions
    const innerWidth = dimensions.width - cfg.margin.left - cfg.margin.right;
    const innerHeight = dimensions.height - cfg.margin.top - cfg.margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${cfg.margin.left},${cfg.margin.top})`);

    // Create scales
    const xDomain = d3.extent(data, d => {
      if (d.x instanceof Date || typeof d.x === 'number') return d.x as any;
      return 0;
    }) as [number, number] | [Date, Date];

    const yDomain = [
      Math.min(0, d3.min(data, d => d.y) || 0),
      d3.max(data, d => d.y) || 1
    ] as [number, number];

    const xScale = xDomain[0] instanceof Date
      ? createTimeScale(xDomain as [Date, Date], [0, innerWidth])
      : createLinearScale(xDomain as [number, number], [0, innerWidth], cfg.xAxis);

    const yScale = createLinearScale(yDomain, [innerHeight, 0], cfg.yAxis);

    // Create grid if enabled
    if (cfg.xAxis.showGrid || cfg.yAxis.showGrid) {
      createGridLines(svg, xScale, yScale, innerWidth, innerHeight, cfg.theme.gridColor);
    }

    // Create axes
    if (cfg.xAxis.showAxis) {
      createXAxis(svg, xScale, innerHeight, cfg.xAxis);
    }
    if (cfg.yAxis.showAxis) {
      createYAxis(svg, yScale, cfg.yAxis);
    }

    // Create line generator
    const line = d3.line<DataPoint>()
      .x(d => xScale(d.x as any) as number)
      .y(d => yScale(d.y));

    if (cfg.curved) {
      line.curve(d3.curveMonotoneX);
    }

    // Create area generator if fill is enabled
    let area: d3.Area<DataPoint> | null = null;
    if (cfg.fillArea) {
      area = d3.area<DataPoint>()
        .x(d => xScale(d.x as any) as number)
        .y0(innerHeight)
        .y1(d => yScale(d.y));

      if (cfg.curved) {
        area.curve(d3.curveMonotoneX);
      }
    }

    // Draw area if enabled
    if (cfg.fillArea && area) {
      const areaPath = svg.append('path')
        .datum(data)
        .attr('class', 'line-area')
        .attr('fill', cfg.theme.accentColor)
        .attr('opacity', 0)
        .attr('d', area);

      if (cfg.animation.enabled) {
        areaPath
          .transition()
          .duration(cfg.animation.duration)
          .attr('opacity', cfg.fillOpacity);
      } else {
        areaPath.attr('opacity', cfg.fillOpacity);
      }
    }

    // Draw line
    const linePath = svg.append('path')
      .datum(data)
      .attr('class', 'line-path')
      .attr('fill', 'none')
      .attr('stroke', cfg.theme.accentColor)
      .attr('stroke-width', cfg.lineWidth)
      .attr('d', line);

    if (cfg.animation.enabled) {
      const totalLength = linePath.node()?.getTotalLength() || 0;
      linePath
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(cfg.animation.duration)
        .ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0);
    }

    // Draw points
    if (cfg.showPoints) {
      const points = svg.selectAll('.line-point')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'line-point')
        .attr('cx', d => xScale(d.x as any) as number)
        .attr('cy', d => yScale(d.y))
        .attr('r', 0)
        .attr('fill', d => d.color || cfg.theme.accentColor)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      if (cfg.animation.enabled) {
        points
          .transition()
          .duration(cfg.animation.duration)
          .delay((d, i) => i * 50)
          .attr('r', cfg.pointRadius);
      } else {
        points.attr('r', cfg.pointRadius);
      }

      // Add interactivity to points
      if (cfg.tooltip.enabled) {
        const tooltip = createTooltip(containerRef.current);

        points
          .on('mouseover', function(event, d) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('r', cfg.pointRadius * 1.5);

            const content = cfg.tooltip.format
              ? cfg.tooltip.format(d)
              : formatTooltipContent(d);

            showTooltip(tooltip, content, { x: event.offsetX, y: event.offsetY }, dimensions.width, dimensions.height);

            if (events.onMouseOver) {
              events.onMouseOver(d, event);
            }
          })
          .on('mouseout', function(event, d) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('r', cfg.pointRadius);

            hideTooltip(tooltip);

            if (events.onMouseOut) {
              events.onMouseOut(d, event);
            }
          })
          .on('click', function(event, d) {
            if (events.onClick) {
              events.onClick(d, event);
            }
          });
      }
    }

    // Add title if provided
    if (cfg.title) {
      svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', innerWidth / 2)
        .attr('y', -cfg.margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', cfg.theme.fontSize * 1.5)
        .attr('font-weight', 'bold')
        .attr('fill', cfg.theme.textColor)
        .text(cfg.title);
    }

  }, [data, dimensions, cfg, events]);

  // Expose chart ref API
  React.useImperativeHandle(chartRef, () => ({
    update: (newData: DataPoint[]) => {
      // Re-render with new data
    },
    export: async (format: 'png' | 'svg' | 'pdf') => {
      // TODO: Implement export functionality
      return new Blob();
    },
    resize: (width: number, height: number) => {
      setDimensions({ width, height });
    },
    reset: () => {
      setDimensions({ width: cfg.width, height: cfg.height });
    },
  }));

  return (
    <div
      ref={containerRef}
      style={{
        width: cfg.responsive ? '100%' : `${cfg.width}px`,
        height: `${cfg.height}px`,
        backgroundColor: cfg.theme.backgroundColor,
        position: 'relative',
      }}
    >
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
};

export default LineChart;
