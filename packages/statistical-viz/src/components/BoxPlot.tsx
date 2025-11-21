import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { BoxPlotData, BoxPlotConfig, BoxPlotStats, StatisticalEventHandlers } from '../types';

export interface BoxPlotProps {
  data: BoxPlotData[];
  config?: Partial<BoxPlotConfig>;
  events?: StatisticalEventHandlers;
  className?: string;
}

const defaultConfig: BoxPlotConfig = {
  width: 600,
  height: 400,
  orientation: 'vertical',
  showOutliers: true,
  showMean: false,
  whiskerType: 'iqr',
  iqrMultiplier: 1.5,
  animate: true,
};

const DEFAULT_COLORS = ['#1976d2', '#dc004e', '#9c27b0', '#f57c00', '#388e3c'];

function calculateBoxPlotStats(values: number[], whiskerType: string, iqrMultiplier: number): BoxPlotStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const q1 = d3.quantile(sorted, 0.25) || 0;
  const median = d3.quantile(sorted, 0.5) || 0;
  const q3 = d3.quantile(sorted, 0.75) || 0;
  const mean = d3.mean(sorted) || 0;

  let min: number;
  let max: number;
  let outliers: number[] = [];

  if (whiskerType === 'iqr') {
    const iqr = q3 - q1;
    const lowerFence = q1 - iqrMultiplier * iqr;
    const upperFence = q3 + iqrMultiplier * iqr;

    min = sorted.find(v => v >= lowerFence) || sorted[0];
    max = [...sorted].reverse().find(v => v <= upperFence) || sorted[n - 1];

    outliers = sorted.filter(v => v < lowerFence || v > upperFence);
  } else if (whiskerType === 'stddev') {
    const stdDev = d3.deviation(sorted) || 0;
    min = mean - 2 * stdDev;
    max = mean + 2 * stdDev;
    outliers = sorted.filter(v => v < min || v > max);
    min = Math.max(min, sorted[0]);
    max = Math.min(max, sorted[n - 1]);
  } else {
    min = sorted[0];
    max = sorted[n - 1];
  }

  return { min, q1, median, q3, max, mean, outliers };
}

export const BoxPlot: React.FC<BoxPlotProps> = ({
  data,
  config = {},
  events = {},
  className,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const cfg = useMemo(() => ({
    ...defaultConfig,
    ...config,
  }), [config]);

  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const innerWidth = cfg.width - margin.left - margin.right;
  const innerHeight = cfg.height - margin.top - margin.bottom;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Calculate stats for each category
    const statsData = data.map((d, i) => ({
      category: d.category,
      stats: calculateBoxPlotStats(d.values, cfg.whiskerType, cfg.iqrMultiplier),
      color: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }));

    // Create scales
    const categories = data.map(d => d.category);
    const allValues = data.flatMap(d => d.values);

    let xScale: any;
    let yScale: any;

    if (cfg.orientation === 'vertical') {
      xScale = d3.scaleBand()
        .domain(categories)
        .range([0, innerWidth])
        .padding(0.3);

      yScale = d3.scaleLinear()
        .domain([
          Math.min(d3.min(allValues) || 0, 0) * 1.1,
          (d3.max(allValues) || 0) * 1.1,
        ])
        .range([innerHeight, 0])
        .nice();
    } else {
      yScale = d3.scaleBand()
        .domain(categories)
        .range([0, innerHeight])
        .padding(0.3);

      xScale = d3.scaleLinear()
        .domain([
          Math.min(d3.min(allValues) || 0, 0) * 1.1,
          (d3.max(allValues) || 0) * 1.1,
        ])
        .range([0, innerWidth])
        .nice();
    }

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    if (cfg.orientation === 'vertical') {
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

      g.append('g')
        .call(d3.axisLeft(yScale));
    } else {
      g.append('g')
        .call(d3.axisLeft(yScale));

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));
    }

    // Draw box plots
    statsData.forEach(({ category, stats, color }) => {
      const boxGroup = g.append('g')
        .attr('class', 'box-plot')
        .style('cursor', 'pointer');

      if (cfg.orientation === 'vertical') {
        const x = xScale(category)!;
        const boxWidth = xScale.bandwidth();
        const centerX = x + boxWidth / 2;

        // Whisker line (min to max)
        boxGroup.append('line')
          .attr('class', 'whisker')
          .attr('x1', centerX)
          .attr('x2', centerX)
          .attr('y1', yScale(stats.min))
          .attr('y2', yScale(stats.max))
          .attr('stroke', color)
          .attr('stroke-width', 1);

        // Whisker caps
        boxGroup.append('line')
          .attr('x1', x + boxWidth * 0.2)
          .attr('x2', x + boxWidth * 0.8)
          .attr('y1', yScale(stats.min))
          .attr('y2', yScale(stats.min))
          .attr('stroke', color)
          .attr('stroke-width', 1);

        boxGroup.append('line')
          .attr('x1', x + boxWidth * 0.2)
          .attr('x2', x + boxWidth * 0.8)
          .attr('y1', yScale(stats.max))
          .attr('y2', yScale(stats.max))
          .attr('stroke', color)
          .attr('stroke-width', 1);

        // Box (Q1 to Q3)
        const boxHeight = yScale(stats.q1) - yScale(stats.q3);
        boxGroup.append('rect')
          .attr('class', 'box')
          .attr('x', x)
          .attr('y', cfg.animate ? yScale(stats.median) : yScale(stats.q3))
          .attr('width', boxWidth)
          .attr('height', cfg.animate ? 0 : boxHeight)
          .attr('fill', color)
          .attr('fill-opacity', 0.3)
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .transition()
          .duration(cfg.animate ? 500 : 0)
          .attr('y', yScale(stats.q3))
          .attr('height', boxHeight);

        // Median line
        boxGroup.append('line')
          .attr('class', 'median')
          .attr('x1', x)
          .attr('x2', x + boxWidth)
          .attr('y1', yScale(stats.median))
          .attr('y2', yScale(stats.median))
          .attr('stroke', color)
          .attr('stroke-width', 3);

        // Mean point
        if (cfg.showMean && stats.mean !== undefined) {
          boxGroup.append('circle')
            .attr('class', 'mean')
            .attr('cx', centerX)
            .attr('cy', yScale(stats.mean))
            .attr('r', 4)
            .attr('fill', 'white')
            .attr('stroke', color)
            .attr('stroke-width', 2);
        }

        // Outliers
        if (cfg.showOutliers) {
          stats.outliers.forEach(outlier => {
            boxGroup.append('circle')
              .attr('class', 'outlier')
              .attr('cx', centerX)
              .attr('cy', yScale(outlier))
              .attr('r', 4)
              .attr('fill', 'none')
              .attr('stroke', color)
              .attr('stroke-width', 1.5);
          });
        }
      } else {
        // Horizontal orientation
        const y = yScale(category)!;
        const boxHeight = yScale.bandwidth();
        const centerY = y + boxHeight / 2;

        // Whisker line
        boxGroup.append('line')
          .attr('y1', centerY)
          .attr('y2', centerY)
          .attr('x1', xScale(stats.min))
          .attr('x2', xScale(stats.max))
          .attr('stroke', color)
          .attr('stroke-width', 1);

        // Whisker caps
        boxGroup.append('line')
          .attr('y1', y + boxHeight * 0.2)
          .attr('y2', y + boxHeight * 0.8)
          .attr('x1', xScale(stats.min))
          .attr('x2', xScale(stats.min))
          .attr('stroke', color)
          .attr('stroke-width', 1);

        boxGroup.append('line')
          .attr('y1', y + boxHeight * 0.2)
          .attr('y2', y + boxHeight * 0.8)
          .attr('x1', xScale(stats.max))
          .attr('x2', xScale(stats.max))
          .attr('stroke', color)
          .attr('stroke-width', 1);

        // Box
        const boxWidth = xScale(stats.q3) - xScale(stats.q1);
        boxGroup.append('rect')
          .attr('y', y)
          .attr('x', xScale(stats.q1))
          .attr('height', boxHeight)
          .attr('width', boxWidth)
          .attr('fill', color)
          .attr('fill-opacity', 0.3)
          .attr('stroke', color)
          .attr('stroke-width', 2);

        // Median line
        boxGroup.append('line')
          .attr('y1', y)
          .attr('y2', y + boxHeight)
          .attr('x1', xScale(stats.median))
          .attr('x2', xScale(stats.median))
          .attr('stroke', color)
          .attr('stroke-width', 3);

        // Mean point
        if (cfg.showMean && stats.mean !== undefined) {
          boxGroup.append('circle')
            .attr('cy', centerY)
            .attr('cx', xScale(stats.mean))
            .attr('r', 4)
            .attr('fill', 'white')
            .attr('stroke', color)
            .attr('stroke-width', 2);
        }

        // Outliers
        if (cfg.showOutliers) {
          stats.outliers.forEach(outlier => {
            boxGroup.append('circle')
              .attr('cy', centerY)
              .attr('cx', xScale(outlier))
              .attr('r', 4)
              .attr('fill', 'none')
              .attr('stroke', color)
              .attr('stroke-width', 1.5);
          });
        }
      }

      // Click handler
      boxGroup.on('click', () => {
        if (events.onDataPointClick) {
          events.onDataPointClick({ category, stats });
        }
      });
    });

  }, [data, cfg, events, innerWidth, innerHeight, margin]);

  return (
    <svg
      ref={svgRef}
      width={cfg.width}
      height={cfg.height}
      className={className}
    />
  );
};

export default BoxPlot;
