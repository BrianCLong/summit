import { z } from 'zod';

/**
 * Widget type enum
 */
export const WidgetType = z.enum([
  'chart',
  'metric',
  'table',
  'map',
  'text',
  'image',
  'iframe',
  'custom',
]);

export type WidgetType = z.infer<typeof WidgetType>;

/**
 * Chart widget configuration
 */
export const ChartWidgetConfigSchema = z.object({
  chartType: z.enum(['line', 'bar', 'scatter', 'pie', 'area', 'heatmap']),
  dataSource: z.string(), // Query ID or data endpoint
  xField: z.string(),
  yField: z.string(),
  groupBy: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  refreshInterval: z.number().optional(), // in milliseconds
});

export type ChartWidgetConfig = z.infer<typeof ChartWidgetConfigSchema>;

/**
 * Metric widget configuration
 */
export const MetricWidgetConfigSchema = z.object({
  dataSource: z.string(),
  metric: z.string(),
  format: z.enum(['number', 'percentage', 'currency', 'custom']).default('number'),
  customFormat: z.string().optional(),
  showTrend: z.boolean().default(true),
  trendPeriod: z.enum(['hour', 'day', 'week', 'month']).optional(),
  thresholds: z.array(z.object({
    value: z.number(),
    color: z.string(),
    operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  })).optional(),
});

export type MetricWidgetConfig = z.infer<typeof MetricWidgetConfigSchema>;

/**
 * Table widget configuration
 */
export const TableWidgetConfigSchema = z.object({
  dataSource: z.string(),
  columns: z.array(z.object({
    field: z.string(),
    header: z.string(),
    sortable: z.boolean().default(true),
    filterable: z.boolean().default(true),
    format: z.string().optional(),
  })),
  pageSize: z.number().default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type TableWidgetConfig = z.infer<typeof TableWidgetConfigSchema>;

/**
 * Widget configuration union
 */
export const WidgetConfigSchema = z.union([
  ChartWidgetConfigSchema,
  MetricWidgetConfigSchema,
  TableWidgetConfigSchema,
  z.record(z.unknown()), // For custom widgets
]);

export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

/**
 * Widget layout
 */
export const WidgetLayoutSchema = z.object({
  i: z.string(), // Widget ID
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
  maxW: z.number().optional(),
  maxH: z.number().optional(),
  static: z.boolean().default(false), // Cannot be moved/resized
});

export type WidgetLayout = z.infer<typeof WidgetLayoutSchema>;

/**
 * Dashboard widget
 */
export const DashboardWidgetSchema = z.object({
  id: z.string(),
  type: WidgetType,
  title: z.string(),
  description: z.string().optional(),
  config: WidgetConfigSchema,
  layout: WidgetLayoutSchema,
  style: z.object({
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
    borderWidth: z.number().optional(),
    borderRadius: z.number().optional(),
    padding: z.number().optional(),
  }).optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;

/**
 * Dashboard filter
 */
export const DashboardFilterSchema = z.object({
  id: z.string(),
  field: z.string(),
  label: z.string(),
  type: z.enum(['select', 'multiselect', 'date', 'daterange', 'text', 'number']),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).optional(),
  defaultValue: z.unknown().optional(),
});

export type DashboardFilter = z.infer<typeof DashboardFilterSchema>;

/**
 * Dashboard theme
 */
export const DashboardThemeSchema = z.object({
  name: z.string(),
  backgroundColor: z.string().default('#f5f5f5'),
  cardBackgroundColor: z.string().default('#ffffff'),
  textColor: z.string().default('#333333'),
  accentColor: z.string().default('#1976d2'),
  gridColor: z.string().default('#e0e0e0'),
  fontFamily: z.string().default('sans-serif'),
});

export type DashboardTheme = z.infer<typeof DashboardThemeSchema>;

/**
 * Dashboard configuration
 */
export const DashboardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  widgets: z.array(DashboardWidgetSchema),
  filters: z.array(DashboardFilterSchema).default([]),
  theme: DashboardThemeSchema.optional(),
  layout: z.object({
    cols: z.number().default(12),
    rowHeight: z.number().default(30),
    compactType: z.enum(['vertical', 'horizontal', null]).default('vertical'),
    preventCollision: z.boolean().default(false),
  }).default({}),
  settings: z.object({
    autoRefresh: z.boolean().default(false),
    refreshInterval: z.number().optional(), // in milliseconds
    timezone: z.string().default('UTC'),
    dateFormat: z.string().default('YYYY-MM-DD'),
    numberFormat: z.string().default('0,0.00'),
  }).default({}),
  permissions: z.object({
    ownerId: z.string(),
    isPublic: z.boolean().default(false),
    sharedWith: z.array(z.object({
      userId: z.string(),
      role: z.enum(['viewer', 'editor', 'admin']),
    })).default([]),
  }),
  metadata: z.object({
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    version: z.number().default(1),
  }).default({}),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Dashboard = z.infer<typeof DashboardSchema>;

/**
 * Dashboard template
 */
export const DashboardTemplateSchema = DashboardSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  permissions: true,
}).extend({
  templateId: z.string(),
  templateName: z.string(),
  previewImage: z.string().optional(),
  category: z.string(),
});

export type DashboardTemplate = z.infer<typeof DashboardTemplateSchema>;

/**
 * Widget event
 */
export interface WidgetEventHandlers {
  onUpdate?: (widgetId: string, config: WidgetConfig) => void;
  onDelete?: (widgetId: string) => void;
  onClick?: (widgetId: string, data: any) => void;
  onDataUpdate?: (widgetId: string, data: any) => void;
}

/**
 * Dashboard event
 */
export interface DashboardEventHandlers {
  onLayoutChange?: (layout: WidgetLayout[]) => void;
  onWidgetAdd?: (widget: DashboardWidget) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetUpdate?: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  onFilterChange?: (filterId: string, value: any) => void;
  onSave?: (dashboard: Dashboard) => void;
  onExport?: (format: 'json' | 'pdf' | 'png') => void;
}
