import { DataPoint, ColorScale, Margin, Dimension } from './types';
import * as d3 from 'd3';

// Color utilities
export const colorPalettes = {
  categorical: [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
  ],
  sequential: {
    blues: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
    greens: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
    reds: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
  },
  diverging: {
    redBlue: ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'],
    purpleGreen: ['#762a83', '#9970ab', '#c2a5cf', '#e7d4e8', '#f7f7f7', '#d9f0d3', '#a6dba0', '#5aae61', '#1b7837'],
  },
};

export function getColorScale(config: ColorScale): (value: any) => string {
  switch (config.type) {
    case 'linear':
      return d3.scaleLinear<string>()
        .domain(config.domain as [number, number])
        .range(config.range)
        .interpolate(d3.interpolateRgb) as (value: any) => string;

    case 'log':
      return d3.scaleLog<string>()
        .domain(config.domain as [number, number])
        .range(config.range) as (value: any) => string;

    case 'sqrt':
      return d3.scaleSqrt<string>()
        .domain(config.domain as [number, number])
        .range(config.range) as (value: any) => string;

    case 'categorical':
      return d3.scaleOrdinal<any, string>()
        .domain(config.domain as string[])
        .range(config.range);

    case 'sequential':
      return d3.scaleSequential(d3.interpolateRgb(config.range[0], config.range[1]))
        .domain(config.domain as [number, number]) as (value: any) => string;

    case 'diverging':
      const divergingScale = d3.scaleDiverging(
        d3.interpolateRgb(config.range[0], config.range[1])
      ).domain(config.domain as [number, number, number]);
      return divergingScale as (value: any) => string;

    default:
      return () => config.range[0];
  }
}

// Data utilities
export function normalizeData<T extends DataPoint>(
  data: T[],
  field: keyof T,
  min: number = 0,
  max: number = 1
): T[] {
  const values = data.map(d => Number(d[field]));
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  return data.map(d => ({
    ...d,
    [field]: ((Number(d[field]) - dataMin) / (dataMax - dataMin)) * (max - min) + min,
  }));
}

export function sortData<T extends DataPoint>(
  data: T[],
  field: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal);
    const bStr = String(bVal);
    return order === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });
}

export function groupData<T extends DataPoint>(
  data: T[],
  field: keyof T
): Record<string, T[]> {
  return data.reduce((groups, item) => {
    const key = String(item[field]);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function aggregateData<T extends DataPoint>(
  data: T[],
  groupBy: keyof T,
  aggregateField: keyof T,
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median' = 'sum'
): DataPoint[] {
  const groups = groupData(data, groupBy);

  return Object.entries(groups).map(([key, items]) => {
    let value: number;

    switch (operation) {
      case 'count':
        value = items.length;
        break;
      case 'sum':
        value = items.reduce((sum, item) => sum + Number(item[aggregateField]), 0);
        break;
      case 'avg':
        value = items.reduce((sum, item) => sum + Number(item[aggregateField]), 0) / items.length;
        break;
      case 'min':
        value = Math.min(...items.map(item => Number(item[aggregateField])));
        break;
      case 'max':
        value = Math.max(...items.map(item => Number(item[aggregateField])));
        break;
      case 'median':
        const sorted = items.map(item => Number(item[aggregateField])).sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        break;
      default:
        value = 0;
    }

    return {
      id: key,
      [groupBy]: key,
      [aggregateField]: value,
    };
  });
}

// Layout utilities
export function calculateInnerDimensions(
  containerDimension: Dimension,
  margin: Margin
): Dimension {
  return {
    width: containerDimension.width - margin.left - margin.right,
    height: containerDimension.height - margin.top - margin.bottom,
  };
}

export function createMargin(
  top: number = 20,
  right: number = 20,
  bottom: number = 20,
  left: number = 20
): Margin {
  return { top, right, bottom, left };
}

// Scale utilities
export function createLinearScale(
  domain: [number, number],
  range: [number, number]
): d3.ScaleLinear<number, number> {
  return d3.scaleLinear().domain(domain).range(range);
}

export function createBandScale(
  domain: string[],
  range: [number, number],
  padding: number = 0.1
): d3.ScaleBand<string> {
  return d3.scaleBand().domain(domain).range(range).padding(padding);
}

export function createTimeScale(
  domain: [Date, Date],
  range: [number, number]
): d3.ScaleTime<number, number> {
  return d3.scaleTime().domain(domain).range(range);
}

// Format utilities
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatDate(date: Date, format: string = 'short'): string {
  const options: Intl.DateTimeFormatOptions =
    format === 'short' ? { month: 'short', day: 'numeric', year: 'numeric' }
    : format === 'long' ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
    : { month: 'numeric', day: 'numeric', year: 'numeric' };

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function formatLargeNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toString();
}

// Geometry utilities
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function midpoint(x1: number, y1: number, x2: number, y2: number): [number, number] {
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}

export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): [number, number] {
  const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
  return [
    centerX + radius * Math.cos(angleInRadians),
    centerY + radius * Math.sin(angleInRadians),
  ];
}

// Statistical utilities
export function mean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function standardDeviation(values: number[]): number {
  const avg = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const meanX = mean(x);
  const meanY = mean(y);

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denominatorX += diffX * diffX;
    denominatorY += diffY * diffY;
  }

  return numerator / Math.sqrt(denominatorX * denominatorY);
}

// Export utilities
export async function exportToSVG(
  svgElement: SVGSVGElement,
  filename: string = 'visualization.svg'
): Promise<void> {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  downloadBlob(blob, filename);
}

export async function exportToPNG(
  svgElement: SVGSVGElement,
  filename: string = 'visualization.png',
  scale: number = 2
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const svgRect = svgElement.getBoundingClientRect();
  canvas.width = svgRect.width * scale;
  canvas.height = svgRect.height * scale;
  ctx.scale(scale, scale);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, filename);
        }
        resolve();
      });
    };
    img.src = url;
  });
}

export function exportToJSON<T>(data: T, filename: string = 'data.json'): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string = 'data.csv'
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => JSON.stringify(row[header] ?? '')).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Debounce and throttle utilities
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
