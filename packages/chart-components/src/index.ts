/**
 * @summit/chart-components
 *
 * Core chart components library for Summit Analytics Platform
 * Provides D3.js-based interactive visualizations with React components
 */

// Export types
export * from './types';

// Export charts
export { LineChart } from './charts/LineChart';
export type { LineChartProps } from './charts/LineChart';

export { BarChart } from './charts/BarChart';
export type { BarChartProps } from './charts/BarChart';

// Export utilities
export * from './utils/scales';
export * from './utils/axes';
export * from './utils/tooltip';

// Re-export commonly used D3 utilities
export { scaleLinear, scaleBand, scaleTime, scaleOrdinal } from 'd3-scale';
export { line, area, pie, arc } from 'd3-shape';
export { select, selectAll } from 'd3-selection';
export { transition } from 'd3-transition';
export { axisBottom, axisLeft, axisTop, axisRight } from 'd3-axis';
