import { z } from 'zod';

/**
 * Base data point schema for all charts
 */
export const DataPointSchema = z.object({
  x: z.union([z.number(), z.string(), z.date()]),
  y: z.number(),
  label: z.string().optional(),
  color: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type DataPoint = z.infer<typeof DataPointSchema>;

/**
 * Time series data point schema
 */
export const TimeSeriesDataPointSchema = z.object({
  timestamp: z.union([z.date(), z.string(), z.number()]),
  value: z.number(),
  label: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type TimeSeriesDataPoint = z.infer<typeof TimeSeriesDataPointSchema>;

/**
 * Multi-series data point schema
 */
export const MultiSeriesDataPointSchema = z.object({
  x: z.union([z.number(), z.string(), z.date()]),
  series: z.record(z.number()),
  metadata: z.record(z.unknown()).optional(),
});

export type MultiSeriesDataPoint = z.infer<typeof MultiSeriesDataPointSchema>;

/**
 * Heat map data point schema
 */
export const HeatMapDataPointSchema = z.object({
  x: z.union([z.number(), z.string()]),
  y: z.union([z.number(), z.string()]),
  value: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type HeatMapDataPoint = z.infer<typeof HeatMapDataPointSchema>;

/**
 * Pie/Donut chart data schema
 */
export const PieChartDataSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PieChartData = z.infer<typeof PieChartDataSchema>;

/**
 * Chart margin configuration
 */
export const MarginSchema = z.object({
  top: z.number().default(20),
  right: z.number().default(20),
  bottom: z.number().default(30),
  left: z.number().default(40),
});

export type Margin = z.infer<typeof MarginSchema>;

/**
 * Chart theme configuration
 */
export const ChartThemeSchema = z.object({
  backgroundColor: z.string().default('#ffffff'),
  textColor: z.string().default('#333333'),
  gridColor: z.string().default('#e0e0e0'),
  accentColor: z.string().default('#1976d2'),
  colors: z.array(z.string()).default([
    '#1976d2', '#dc004e', '#9c27b0', '#f57c00',
    '#388e3c', '#00796b', '#5d4037', '#455a64'
  ]),
  fontSize: z.number().default(12),
  fontFamily: z.string().default('sans-serif'),
});

export type ChartTheme = z.infer<typeof ChartThemeSchema>;

/**
 * Axis configuration
 */
export const AxisConfigSchema = z.object({
  label: z.string().optional(),
  showGrid: z.boolean().default(true),
  showAxis: z.boolean().default(true),
  tickCount: z.number().optional(),
  tickFormat: z.function().optional() as z.ZodType<((value: any) => string) | undefined>,
  domain: z.tuple([z.number(), z.number()]).optional(),
});

export type AxisConfig = z.infer<typeof AxisConfigSchema>;

/**
 * Tooltip configuration
 */
export const TooltipConfigSchema = z.object({
  enabled: z.boolean().default(true),
  format: z.function().optional() as z.ZodType<((data: any) => string) | undefined>,
});

export type TooltipConfig = z.infer<typeof TooltipConfigSchema>;

/**
 * Legend configuration
 */
export const LegendConfigSchema = z.object({
  show: z.boolean().default(true),
  position: z.enum(['top', 'right', 'bottom', 'left']).default('right'),
  orientation: z.enum(['horizontal', 'vertical']).default('vertical'),
});

export type LegendConfig = z.infer<typeof LegendConfigSchema>;

/**
 * Animation configuration
 */
export const AnimationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  duration: z.number().default(750),
  easing: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']).default('ease-in-out'),
});

export type AnimationConfig = z.infer<typeof AnimationConfigSchema>;

/**
 * Base chart configuration
 */
export const BaseChartConfigSchema = z.object({
  width: z.number().default(800),
  height: z.number().default(400),
  margin: MarginSchema.default({}),
  theme: ChartThemeSchema.default({}),
  responsive: z.boolean().default(true),
  animation: AnimationConfigSchema.default({}),
  tooltip: TooltipConfigSchema.default({}),
  legend: LegendConfigSchema.default({}),
  title: z.string().optional(),
  subtitle: z.string().optional(),
});

export type BaseChartConfig = z.infer<typeof BaseChartConfigSchema>;

/**
 * Line chart specific configuration
 */
export const LineChartConfigSchema = BaseChartConfigSchema.extend({
  xAxis: AxisConfigSchema.default({}),
  yAxis: AxisConfigSchema.default({}),
  showPoints: z.boolean().default(true),
  pointRadius: z.number().default(4),
  lineWidth: z.number().default(2),
  curved: z.boolean().default(true),
  fillArea: z.boolean().default(false),
  fillOpacity: z.number().default(0.1),
});

export type LineChartConfig = z.infer<typeof LineChartConfigSchema>;

/**
 * Bar chart specific configuration
 */
export const BarChartConfigSchema = BaseChartConfigSchema.extend({
  xAxis: AxisConfigSchema.default({}),
  yAxis: AxisConfigSchema.default({}),
  orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
  barPadding: z.number().default(0.1),
  grouped: z.boolean().default(false),
  stacked: z.boolean().default(false),
});

export type BarChartConfig = z.infer<typeof BarChartConfigSchema>;

/**
 * Scatter plot specific configuration
 */
export const ScatterPlotConfigSchema = BaseChartConfigSchema.extend({
  xAxis: AxisConfigSchema.default({}),
  yAxis: AxisConfigSchema.default({}),
  pointRadius: z.number().default(4),
  pointOpacity: z.number().default(0.7),
  showTrendLine: z.boolean().default(false),
});

export type ScatterPlotConfig = z.infer<typeof ScatterPlotConfigSchema>;

/**
 * Heat map specific configuration
 */
export const HeatMapConfigSchema = BaseChartConfigSchema.extend({
  colorScheme: z.enum(['blues', 'greens', 'reds', 'viridis', 'plasma', 'custom']).default('blues'),
  customColors: z.array(z.string()).optional(),
  showValues: z.boolean().default(true),
  cellPadding: z.number().default(2),
});

export type HeatMapConfig = z.infer<typeof HeatMapConfigSchema>;

/**
 * Pie/Donut chart configuration
 */
export const PieChartConfigSchema = BaseChartConfigSchema.extend({
  innerRadius: z.number().default(0), // 0 = pie, > 0 = donut
  padAngle: z.number().default(0.02),
  showLabels: z.boolean().default(true),
  showPercentages: z.boolean().default(true),
});

export type PieChartConfig = z.infer<typeof PieChartConfigSchema>;

/**
 * Chart interaction events
 */
export interface ChartEventHandlers {
  onClick?: (data: any, event: MouseEvent) => void;
  onMouseOver?: (data: any, event: MouseEvent) => void;
  onMouseOut?: (data: any, event: MouseEvent) => void;
  onBrush?: (selection: [number, number] | null) => void;
  onZoom?: (transform: { x: number; y: number; k: number }) => void;
}

/**
 * Chart ref for imperative API
 */
export interface ChartRef {
  update: (data: any[]) => void;
  export: (format: 'png' | 'svg' | 'pdf') => Promise<Blob>;
  resize: (width: number, height: number) => void;
  reset: () => void;
}
