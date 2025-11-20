import * as d3 from 'd3';
import type { AxisConfig } from '../types';

/**
 * Create a linear scale for numeric data
 */
export function createLinearScale(
  domain: [number, number],
  range: [number, number],
  config?: AxisConfig
): d3.ScaleLinear<number, number> {
  const scale = d3.scaleLinear()
    .domain(config?.domain || domain)
    .range(range)
    .nice();

  return scale;
}

/**
 * Create a band scale for categorical data
 */
export function createBandScale(
  domain: string[],
  range: [number, number],
  padding = 0.1
): d3.ScaleBand<string> {
  return d3.scaleBand()
    .domain(domain)
    .range(range)
    .padding(padding);
}

/**
 * Create a time scale for temporal data
 */
export function createTimeScale(
  domain: [Date, Date],
  range: [number, number]
): d3.ScaleTime<number, number> {
  return d3.scaleTime()
    .domain(domain)
    .range(range)
    .nice();
}

/**
 * Create a color scale
 */
export function createColorScale(
  domain: string[],
  colors?: string[]
): d3.ScaleOrdinal<string, string> {
  const defaultColors = d3.schemeCategory10;
  return d3.scaleOrdinal<string>()
    .domain(domain)
    .range(colors || defaultColors);
}

/**
 * Create a sequential color scale for continuous data
 */
export function createSequentialColorScale(
  domain: [number, number],
  scheme: 'blues' | 'greens' | 'reds' | 'viridis' | 'plasma' = 'blues'
): d3.ScaleSequential<string> {
  const interpolators: Record<string, (t: number) => string> = {
    blues: d3.interpolateBlues,
    greens: d3.interpolateGreens,
    reds: d3.interpolateReds,
    viridis: d3.interpolateViridis,
    plasma: d3.interpolatePlasma,
  };

  return d3.scaleSequential(interpolators[scheme])
    .domain(domain);
}

/**
 * Create a logarithmic scale
 */
export function createLogScale(
  domain: [number, number],
  range: [number, number]
): d3.ScaleLogarithmic<number, number> {
  return d3.scaleLog()
    .domain(domain)
    .range(range)
    .nice();
}

/**
 * Create a square root scale
 */
export function createSqrtScale(
  domain: [number, number],
  range: [number, number]
): d3.ScalePower<number, number> {
  return d3.scaleSqrt()
    .domain(domain)
    .range(range)
    .nice();
}

/**
 * Infer scale type from data
 */
export function inferScaleType(data: any[]): 'linear' | 'time' | 'band' | 'log' {
  if (data.length === 0) return 'linear';

  const firstValue = data[0];

  if (firstValue instanceof Date) return 'time';
  if (typeof firstValue === 'string') return 'band';
  if (typeof firstValue === 'number') {
    // Check if log scale would be appropriate (all positive values spanning multiple orders of magnitude)
    const values = data.filter(d => typeof d === 'number' && d > 0);
    if (values.length === data.length) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (max / min > 100) return 'log';
    }
    return 'linear';
  }

  return 'linear';
}
