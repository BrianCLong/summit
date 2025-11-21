/**
 * @summit/visualization
 *
 * Core visualization library for Summit Analytics Platform
 * Provides hooks, utilities, and base components for building visualizations
 */

export * from './types';
export * from './hooks/useVisualization';

// Re-export D3 for convenience
export { select, selectAll } from 'd3-selection';
export { scaleLinear, scaleBand, scaleTime, scaleOrdinal, scaleSequential } from 'd3-scale';
export { line, area, pie, arc, curveMonotoneX, curveCardinal } from 'd3-shape';
export { axisBottom, axisLeft, axisTop, axisRight } from 'd3-axis';
export { transition } from 'd3-transition';
export { zoom, zoomIdentity } from 'd3-zoom';
export { brush, brushX, brushY } from 'd3-brush';
export { extent, min, max, mean, median, sum, group, rollup } from 'd3-array';
export { format as formatNumber } from 'd3-format';
export { timeFormat, timeParse } from 'd3-time-format';
