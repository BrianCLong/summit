import { z } from 'zod';

/**
 * Core visualization types and interfaces
 */

export const DataSourceSchema = z.object({
  id: z.string(),
  type: z.enum(['query', 'api', 'websocket', 'static']),
  config: z.record(z.unknown()),
  refreshInterval: z.number().optional(),
});

export type DataSource = z.infer<typeof DataSourceSchema>;

export const FilterSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'startsWith', 'endsWith']),
  value: z.unknown(),
});

export type Filter = z.infer<typeof FilterSchema>;

export const SortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
});

export type Sort = z.infer<typeof SortSchema>;

export const DataQuerySchema = z.object({
  source: DataSourceSchema,
  filters: z.array(FilterSchema).default([]),
  sort: z.array(SortSchema).default([]),
  limit: z.number().optional(),
  offset: z.number().optional(),
  aggregations: z.array(z.object({
    field: z.string(),
    function: z.enum(['sum', 'avg', 'min', 'max', 'count', 'distinct']),
    alias: z.string().optional(),
  })).optional(),
  groupBy: z.array(z.string()).optional(),
});

export type DataQuery = z.infer<typeof DataQuerySchema>;

export const ColorScaleSchema = z.object({
  type: z.enum(['sequential', 'diverging', 'categorical', 'threshold']),
  domain: z.array(z.union([z.number(), z.string()])).optional(),
  range: z.array(z.string()).optional(),
  scheme: z.string().optional(),
});

export type ColorScale = z.infer<typeof ColorScaleSchema>;

export const LegendSchema = z.object({
  show: z.boolean().default(true),
  position: z.enum(['top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).default('right'),
  orientation: z.enum(['horizontal', 'vertical']).default('vertical'),
  title: z.string().optional(),
});

export type Legend = z.infer<typeof LegendSchema>;

export const InteractionSchema = z.object({
  hover: z.boolean().default(true),
  click: z.boolean().default(true),
  brush: z.boolean().default(false),
  zoom: z.boolean().default(false),
  pan: z.boolean().default(false),
  crossfilter: z.boolean().default(false),
});

export type Interaction = z.infer<typeof InteractionSchema>;

export interface VisualizationContext {
  width: number;
  height: number;
  theme: VisualizationTheme;
  colorScale: ColorScale;
  interactions: Interaction;
}

export interface VisualizationTheme {
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  accentColor: string;
  colors: string[];
  fontSize: number;
  fontFamily: string;
}

export interface VisualizationProps<TData = unknown, TConfig = unknown> {
  data: TData;
  config: TConfig;
  context?: Partial<VisualizationContext>;
  onDataPointClick?: (point: unknown, event: MouseEvent) => void;
  onBrush?: (selection: unknown) => void;
  onZoom?: (transform: { x: number; y: number; k: number }) => void;
}

export const DEFAULT_THEME: VisualizationTheme = {
  backgroundColor: '#ffffff',
  textColor: '#333333',
  gridColor: '#e0e0e0',
  accentColor: '#1976d2',
  colors: [
    '#1976d2', '#dc004e', '#9c27b0', '#f57c00',
    '#388e3c', '#00796b', '#5d4037', '#455a64',
    '#7b1fa2', '#c2185b', '#512da8', '#0097a7',
  ],
  fontSize: 12,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export const DEFAULT_INTERACTIONS: Interaction = {
  hover: true,
  click: true,
  brush: false,
  zoom: false,
  pan: false,
  crossfilter: false,
};
