import { z } from 'zod';

export const TimeSeriesPointSchema = z.object({
  timestamp: z.union([z.date(), z.string(), z.number()]),
  value: z.number(),
  label: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;

export const TimeSeriesSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: z.array(TimeSeriesPointSchema),
  color: z.string().optional(),
  type: z.enum(['line', 'area', 'bar', 'scatter']).default('line'),
  yAxisId: z.string().optional(),
});

export type TimeSeries = z.infer<typeof TimeSeriesSchema>;

export const TimeRangeSchema = z.object({
  start: z.union([z.date(), z.string(), z.number()]),
  end: z.union([z.date(), z.string(), z.number()]),
});

export type TimeRange = z.infer<typeof TimeRangeSchema>;

export const AnnotationSchema = z.object({
  id: z.string(),
  timestamp: z.union([z.date(), z.string(), z.number()]),
  label: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(['point', 'range', 'threshold']).default('point'),
  endTimestamp: z.union([z.date(), z.string(), z.number()]).optional(),
  value: z.number().optional(),
});

export type Annotation = z.infer<typeof AnnotationSchema>;

export const TimeSeriesChartConfigSchema = z.object({
  width: z.number().default(800),
  height: z.number().default(400),
  margin: z.object({
    top: z.number().default(20),
    right: z.number().default(20),
    bottom: z.number().default(50),
    left: z.number().default(60),
  }).default({}),
  showLegend: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  showTooltip: z.boolean().default(true),
  enableBrush: z.boolean().default(false),
  enableZoom: z.boolean().default(false),
  animate: z.boolean().default(true),
  animationDuration: z.number().default(500),
  dateFormat: z.string().default('%Y-%m-%d'),
  timeFormat: z.string().default('%H:%M'),
  valueFormat: z.string().default(',.2f'),
  interpolation: z.enum(['linear', 'step', 'stepAfter', 'stepBefore', 'natural', 'monotone']).default('monotone'),
});

export type TimeSeriesChartConfig = z.infer<typeof TimeSeriesChartConfigSchema>;

export const EventTimelineItemSchema = z.object({
  id: z.string(),
  start: z.union([z.date(), z.string(), z.number()]),
  end: z.union([z.date(), z.string(), z.number()]).optional(),
  content: z.string(),
  group: z.string().optional(),
  type: z.enum(['point', 'range', 'background']).default('point'),
  className: z.string().optional(),
  style: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type EventTimelineItem = z.infer<typeof EventTimelineItemSchema>;

export const EventTimelineGroupSchema = z.object({
  id: z.string(),
  content: z.string(),
  order: z.number().optional(),
  className: z.string().optional(),
  style: z.string().optional(),
  nestedGroups: z.array(z.string()).optional(),
});

export type EventTimelineGroup = z.infer<typeof EventTimelineGroupSchema>;

export const EventTimelineConfigSchema = z.object({
  width: z.number().optional(),
  height: z.number().default(400),
  start: z.union([z.date(), z.string(), z.number()]).optional(),
  end: z.union([z.date(), z.string(), z.number()]).optional(),
  minZoom: z.number().default(10), // min zoom in milliseconds
  maxZoom: z.number().default(315360000000), // 10 years max
  stack: z.boolean().default(true),
  stackSubgroups: z.boolean().default(true),
  showCurrentTime: z.boolean().default(true),
  zoomable: z.boolean().default(true),
  moveable: z.boolean().default(true),
  selectable: z.boolean().default(true),
  multiselect: z.boolean().default(false),
});

export type EventTimelineConfig = z.infer<typeof EventTimelineConfigSchema>;

export interface TimeSeriesEventHandlers {
  onTimeRangeChange?: (range: TimeRange) => void;
  onBrush?: (range: TimeRange | null) => void;
  onDataPointClick?: (point: TimeSeriesPoint, series: TimeSeries) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
}

export interface EventTimelineEventHandlers {
  onItemSelect?: (items: EventTimelineItem[]) => void;
  onItemClick?: (item: EventTimelineItem) => void;
  onItemDoubleClick?: (item: EventTimelineItem) => void;
  onRangeChange?: (range: TimeRange) => void;
  onTimeChange?: (time: Date) => void;
}
