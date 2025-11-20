import * as d3 from 'd3';
import type { AxisConfig } from '../types';

/**
 * Create and render an X axis
 */
export function createXAxis(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  scale: any,
  height: number,
  config: AxisConfig = {}
): d3.Selection<SVGGElement, unknown, null, undefined> {
  const axis = d3.axisBottom(scale);

  if (config.tickCount) {
    axis.ticks(config.tickCount);
  }

  if (config.tickFormat) {
    axis.tickFormat(config.tickFormat as any);
  }

  const axisGroup = svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(axis);

  // Add axis label if provided
  if (config.label) {
    axisGroup.append('text')
      .attr('class', 'axis-label')
      .attr('x', scale.range()[1] / 2)
      .attr('y', 40)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .text(config.label);
  }

  // Style the axis
  if (!config.showAxis) {
    axisGroup.style('display', 'none');
  }

  return axisGroup;
}

/**
 * Create and render a Y axis
 */
export function createYAxis(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  scale: any,
  config: AxisConfig = {}
): d3.Selection<SVGGElement, unknown, null, undefined> {
  const axis = d3.axisLeft(scale);

  if (config.tickCount) {
    axis.ticks(config.tickCount);
  }

  if (config.tickFormat) {
    axis.tickFormat(config.tickFormat as any);
  }

  const axisGroup = svg.append('g')
    .attr('class', 'y-axis')
    .call(axis);

  // Add axis label if provided
  if (config.label) {
    axisGroup.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -scale.range()[0] / 2)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .text(config.label);
  }

  // Style the axis
  if (!config.showAxis) {
    axisGroup.style('display', 'none');
  }

  return axisGroup;
}

/**
 * Create grid lines for better readability
 */
export function createGridLines(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: any,
  yScale: any,
  width: number,
  height: number,
  gridColor: string = '#e0e0e0'
): void {
  // Horizontal grid lines
  svg.append('g')
    .attr('class', 'grid grid-horizontal')
    .call(
      d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
    )
    .style('stroke', gridColor)
    .style('stroke-opacity', 0.5)
    .style('stroke-dasharray', '2,2');

  // Vertical grid lines
  svg.append('g')
    .attr('class', 'grid grid-vertical')
    .attr('transform', `translate(0,${height})`)
    .call(
      d3.axisBottom(xScale)
        .tickSize(-height)
        .tickFormat(() => '')
    )
    .style('stroke', gridColor)
    .style('stroke-opacity', 0.5)
    .style('stroke-dasharray', '2,2');

  // Remove domain line from grid
  svg.selectAll('.grid .domain').remove();
}

/**
 * Update axis with animation
 */
export function updateAxis(
  axisGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  axis: d3.Axis<any>,
  duration: number = 750
): void {
  axisGroup
    .transition()
    .duration(duration)
    .call(axis);
}

/**
 * Format tick values based on data type and magnitude
 */
export function autoFormatTick(value: number | Date): string {
  if (value instanceof Date) {
    return d3.timeFormat('%Y-%m-%d')(value);
  }

  if (typeof value === 'number') {
    if (Math.abs(value) >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    } else if (Math.abs(value) < 1 && value !== 0) {
      return value.toExponential(2);
    } else {
      return value.toFixed(2);
    }
  }

  return String(value);
}
