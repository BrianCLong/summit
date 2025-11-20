import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type {
  DataPoint,
  BarChartConfig,
  ChartEventHandlers,
  ChartRef,
} from '../types';
import { createLinearScale, createBandScale } from '../utils/scales';
import { createXAxis, createYAxis, createGridLines } from '../utils/axes';
import { createTooltip, showTooltip, hideTooltip, formatTooltipContent } from '../utils/tooltip';

export interface BarChartProps {
  data: DataPoint[];
  config?: Partial<BarChartConfig>;
  events?: ChartEventHandlers;
  chartRef?: React.Ref<ChartRef>;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  config = {},
  events = {},
  chartRef,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: config.width || 800, height: config.height || 400 });

  // Parse config with defaults
  const cfg: BarChartConfig = {
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
    orientation: config.orientation || 'vertical',
    barPadding: config.barPadding || 0.1,
    grouped: config.grouped ?? false,
    stacked: config.stacked ?? false,
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

    // Create scales based on orientation
    let xScale: any;
    let yScale: any;

    if (cfg.orientation === 'vertical') {
      // X axis is categorical (band scale)
      const xDomain = data.map(d => String(d.x));
      xScale = createBandScale(xDomain, [0, innerWidth], cfg.barPadding);

      // Y axis is numeric (linear scale)
      const yDomain = [
        Math.min(0, d3.min(data, d => d.y) || 0),
        d3.max(data, d => d.y) || 1
      ] as [number, number];
      yScale = createLinearScale(yDomain, [innerHeight, 0], cfg.yAxis);
    } else {
      // Horizontal orientation (swapped)
      const yDomain = data.map(d => String(d.x));
      yScale = createBandScale(yDomain, [innerHeight, 0], cfg.barPadding);

      const xDomain = [
        Math.min(0, d3.min(data, d => d.y) || 0),
        d3.max(data, d => d.y) || 1
      ] as [number, number];
      xScale = createLinearScale(xDomain, [0, innerWidth], cfg.xAxis);
    }

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

    // Create tooltip
    const tooltip = cfg.tooltip.enabled ? createTooltip(containerRef.current) : null;

    // Draw bars
    const bars = svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('fill', d => d.color || cfg.theme.accentColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    if (cfg.orientation === 'vertical') {
      bars
        .attr('x', d => xScale(String(d.x)) || 0)
        .attr('width', xScale.bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0);

      if (cfg.animation.enabled) {
        bars
          .transition()
          .duration(cfg.animation.duration)
          .delay((d, i) => i * 50)
          .attr('y', d => yScale(d.y))
          .attr('height', d => innerHeight - yScale(d.y));
      } else {
        bars
          .attr('y', d => yScale(d.y))
          .attr('height', d => innerHeight - yScale(d.y));
      }
    } else {
      // Horizontal bars
      bars
        .attr('y', d => yScale(String(d.x)) || 0)
        .attr('height', yScale.bandwidth())
        .attr('x', 0)
        .attr('width', 0);

      if (cfg.animation.enabled) {
        bars
          .transition()
          .duration(cfg.animation.duration)
          .delay((d, i) => i * 50)
          .attr('x', 0)
          .attr('width', d => xScale(d.y));
      } else {
        bars
          .attr('x', 0)
          .attr('width', d => xScale(d.y));
      }
    }

    // Add interactivity
    bars
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8);

        if (tooltip) {
          const content = cfg.tooltip.format
            ? cfg.tooltip.format(d)
            : formatTooltipContent(d);

          showTooltip(tooltip, content, { x: event.offsetX, y: event.offsetY }, dimensions.width, dimensions.height);
        }

        if (events.onMouseOver) {
          events.onMouseOver(d, event);
        }
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1);

        if (tooltip) {
          hideTooltip(tooltip);
        }

        if (events.onMouseOut) {
          events.onMouseOut(d, event);
        }
      })
      .on('click', function(event, d) {
        if (events.onClick) {
          events.onClick(d, event);
        }
      });

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

export default BarChart;
