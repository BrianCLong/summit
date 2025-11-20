// Core Types for Visualization System

export interface DataPoint {
  id: string | number;
  [key: string]: any;
}

export interface VisualizationConfig {
  id: string;
  type: string;
  title: string;
  data: DataPoint[];
  options: VisualizationOptions;
}

export interface VisualizationOptions {
  width?: number;
  height?: number;
  responsive?: boolean;
  theme?: VisualizationTheme;
  animation?: AnimationConfig;
  interaction?: InteractionConfig;
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  axes?: AxesConfig;
  colors?: string[] | ColorScale;
}

export interface VisualizationTheme {
  background?: string;
  foreground?: string;
  grid?: GridConfig;
  fonts?: FontConfig;
  colors?: ColorPalette;
}

export interface ColorPalette {
  primary: string[];
  secondary: string[];
  diverging: string[];
  sequential: string[];
  categorical: string[];
}

export interface ColorScale {
  type: 'linear' | 'log' | 'sqrt' | 'categorical' | 'sequential' | 'diverging';
  domain: [number, number] | string[];
  range: string[];
}

export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
}

export interface InteractionConfig {
  enabled: boolean;
  zoom?: boolean;
  pan?: boolean;
  brush?: boolean;
  hover?: boolean;
  click?: boolean;
  drag?: boolean;
  select?: boolean;
  crossfilter?: boolean;
}

export interface LegendConfig {
  enabled: boolean;
  position: 'top' | 'right' | 'bottom' | 'left' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  orientation?: 'horizontal' | 'vertical';
  title?: string;
}

export interface TooltipConfig {
  enabled: boolean;
  format?: (dataPoint: DataPoint) => string;
  position?: 'mouse' | 'fixed';
  theme?: 'light' | 'dark';
}

export interface AxesConfig {
  x?: AxisConfig;
  y?: AxisConfig;
  y2?: AxisConfig;
}

export interface AxisConfig {
  label?: string;
  scale?: 'linear' | 'log' | 'time' | 'band' | 'point';
  domain?: [number, number] | string[];
  ticks?: number;
  format?: (value: any) => string;
  grid?: boolean;
}

export interface GridConfig {
  enabled: boolean;
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export interface FontConfig {
  family?: string;
  size?: number;
  weight?: number | string;
}

export interface Dimension {
  width: number;
  height: number;
}

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  translate?: [number, number];
  scale?: [number, number];
  rotate?: number;
}

// Event Types
export interface VisualizationEvent<T = any> {
  type: string;
  target: any;
  data?: T;
  timestamp: number;
}

export interface SelectionEvent extends VisualizationEvent {
  selection: DataPoint[];
}

export interface HoverEvent extends VisualizationEvent {
  dataPoint: DataPoint | null;
}

export interface ZoomEvent extends VisualizationEvent {
  transform: Transform;
  scale: number;
}

export interface BrushEvent extends VisualizationEvent {
  selection: BoundingBox | null;
}

// Data Operations
export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface DataAggregation {
  field: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median' | 'mode';
  groupBy?: string[];
}

export interface DataTransform {
  type: 'filter' | 'aggregate' | 'sort' | 'join' | 'pivot' | 'calculate';
  config: any;
}

// Export/Share Types
export interface ExportConfig {
  format: 'png' | 'svg' | 'pdf' | 'json' | 'csv';
  quality?: number;
  scale?: number;
  filename?: string;
}

export interface ShareConfig {
  url?: string;
  embedCode?: string;
  permissions?: string[];
}
