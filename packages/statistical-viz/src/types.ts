import { z } from 'zod';

export const BoxPlotDataSchema = z.object({
  category: z.string(),
  values: z.array(z.number()),
  color: z.string().optional(),
});

export type BoxPlotData = z.infer<typeof BoxPlotDataSchema>;

export const BoxPlotStatsSchema = z.object({
  min: z.number(),
  q1: z.number(),
  median: z.number(),
  q3: z.number(),
  max: z.number(),
  mean: z.number().optional(),
  outliers: z.array(z.number()).default([]),
});

export type BoxPlotStats = z.infer<typeof BoxPlotStatsSchema>;

export const HistogramDataSchema = z.object({
  values: z.array(z.number()),
  label: z.string().optional(),
  color: z.string().optional(),
});

export type HistogramData = z.infer<typeof HistogramDataSchema>;

export const ScatterDataPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  size: z.number().optional(),
  color: z.string().optional(),
  label: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ScatterDataPoint = z.infer<typeof ScatterDataPointSchema>;

export const CorrelationMatrixDataSchema = z.object({
  variables: z.array(z.string()),
  matrix: z.array(z.array(z.number())),
});

export type CorrelationMatrixData = z.infer<typeof CorrelationMatrixDataSchema>;

export const BoxPlotConfigSchema = z.object({
  width: z.number().default(600),
  height: z.number().default(400),
  orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
  showOutliers: z.boolean().default(true),
  showMean: z.boolean().default(false),
  whiskerType: z.enum(['minmax', 'iqr', 'stddev']).default('iqr'),
  iqrMultiplier: z.number().default(1.5),
  animate: z.boolean().default(true),
});

export type BoxPlotConfig = z.infer<typeof BoxPlotConfigSchema>;

export const HistogramConfigSchema = z.object({
  width: z.number().default(600),
  height: z.number().default(400),
  binCount: z.number().optional(),
  binWidth: z.number().optional(),
  showDensity: z.boolean().default(false),
  showKDE: z.boolean().default(false),
  normalize: z.boolean().default(false),
  cumulative: z.boolean().default(false),
  animate: z.boolean().default(true),
});

export type HistogramConfig = z.infer<typeof HistogramConfigSchema>;

export const ScatterPlotConfigSchema = z.object({
  width: z.number().default(600),
  height: z.number().default(400),
  pointSize: z.number().default(6),
  pointOpacity: z.number().default(0.7),
  showTrendLine: z.boolean().default(false),
  trendLineType: z.enum(['linear', 'polynomial', 'loess']).default('linear'),
  polynomialDegree: z.number().default(2),
  showConfidenceInterval: z.boolean().default(false),
  confidenceLevel: z.number().default(0.95),
  showRSquared: z.boolean().default(false),
  animate: z.boolean().default(true),
});

export type ScatterPlotConfig = z.infer<typeof ScatterPlotConfigSchema>;

export const CorrelationMatrixConfigSchema = z.object({
  width: z.number().default(600),
  height: z.number().default(600),
  colorScheme: z.enum(['diverging', 'sequential']).default('diverging'),
  showValues: z.boolean().default(true),
  showSignificance: z.boolean().default(false),
  significanceLevel: z.number().default(0.05),
  cellSize: z.number().default(50),
  animate: z.boolean().default(true),
});

export type CorrelationMatrixConfig = z.infer<typeof CorrelationMatrixConfigSchema>;

export interface StatisticalEventHandlers {
  onDataPointClick?: (point: any) => void;
  onBrush?: (selection: any) => void;
  onCellClick?: (row: string, col: string, value: number) => void;
}
