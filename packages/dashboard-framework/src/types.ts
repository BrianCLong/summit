// Dashboard Framework Types

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  pages: DashboardPage[];
  theme?: DashboardTheme;
  permissions?: DashboardPermissions;
  metadata?: DashboardMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardPage {
  id: string;
  name: string;
  layout: LayoutConfig;
  widgets: Widget[];
  filters?: GlobalFilter[];
  order: number;
}

export interface LayoutConfig {
  type: 'grid' | 'free' | 'responsive';
  columns?: number;
  rowHeight?: number;
  breakpoints?: Record<string, number>;
  cols?: Record<string, number>;
  gaps?: { x: number; y: number };
  margin?: { x: number; y: number };
  containerPadding?: { x: number; y: number };
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
}

export interface Widget {
  id: string;
  type: string;
  title: string;
  config: WidgetConfig;
  layout: WidgetLayout;
  dataSource?: DataSourceConfig;
  interactions?: WidgetInteractions;
  style?: WidgetStyle;
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

export interface WidgetConfig {
  [key: string]: any;
}

export interface DataSourceConfig {
  type: 'graphql' | 'rest' | 'websocket' | 'static';
  endpoint?: string;
  query?: string;
  variables?: Record<string, any>;
  refreshInterval?: number;
  cache?: boolean;
  transform?: (data: any) => any;
}

export interface WidgetInteractions {
  onClick?: string;
  onHover?: string;
  onSelect?: string;
  drillDown?: DrillDownConfig;
  crossFilter?: boolean;
  exportable?: boolean;
}

export interface DrillDownConfig {
  enabled: boolean;
  targetDashboard?: string;
  targetWidget?: string;
  params?: Record<string, string>;
}

export interface WidgetStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  shadow?: string;
}

export interface DashboardTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string[];
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: number;
      medium: number;
      large: number;
    };
  };
  spacing: {
    unit: number;
  };
  borderRadius: number;
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface DashboardPermissions {
  owner: string;
  viewers: string[];
  editors: string[];
  isPublic: boolean;
  allowExport: boolean;
  allowShare: boolean;
}

export interface DashboardMetadata {
  tags: string[];
  category?: string;
  folder?: string;
  starred?: boolean;
  lastViewed?: Date;
  viewCount?: number;
}

export interface GlobalFilter {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'daterange' | 'search' | 'slider';
  field: string;
  value: any;
  options?: any[];
  applies to?: string[]; // widget IDs
}

// Widget Type Definitions
export interface ChartWidgetConfig extends WidgetConfig {
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap' | 'treemap' | 'sankey';
  xAxis?: string;
  yAxis?: string | string[];
  groupBy?: string;
  colors?: string[];
  legend?: boolean;
  tooltip?: boolean;
  animation?: boolean;
}

export interface MapWidgetConfig extends WidgetConfig {
  mapType: 'choropleth' | 'heatmap' | 'points' | 'routes' | 'clusters';
  center?: [number, number];
  zoom?: number;
  layers?: MapLayer[];
  style?: string;
}

export interface MapLayer {
  id: string;
  type: string;
  source: string;
  paint?: Record<string, any>;
  filter?: any[];
  visible: boolean;
}

export interface TableWidgetConfig extends WidgetConfig {
  columns: TableColumn[];
  sortable?: boolean;
  filterable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  selectable?: boolean;
  exportable?: boolean;
}

export interface TableColumn {
  id: string;
  label: string;
  field: string;
  type?: 'string' | 'number' | 'date' | 'boolean';
  format?: (value: any) => string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
}

export interface MetricWidgetConfig extends WidgetConfig {
  value: number | string;
  label: string;
  format?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  icon?: string;
  color?: string;
  target?: number;
}

export interface NetworkGraphWidgetConfig extends WidgetConfig {
  layout: 'force' | 'hierarchical' | 'circular' | 'radial';
  nodeSize?: string;
  nodeColor?: string;
  edgeWidth?: string;
  edgeColor?: string;
  physics?: boolean;
  clustering?: boolean;
}

export interface TimelineWidgetConfig extends WidgetConfig {
  startField: string;
  endField?: string;
  labelField: string;
  groupField?: string;
  zoom?: boolean;
  pan?: boolean;
}

// Builder Types
export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  category: 'chart' | 'map' | 'table' | 'metric' | 'network' | 'timeline' | 'custom';
  icon: string;
  defaultConfig: WidgetConfig;
  defaultLayout: WidgetLayout;
  thumbnail?: string;
  tags: string[];
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>;
  tags: string[];
}

// Export Types
export interface ExportOptions {
  format: 'pdf' | 'png' | 'pptx' | 'json';
  includeData?: boolean;
  quality?: number;
  pageSize?: 'a4' | 'letter' | 'custom';
  orientation?: 'portrait' | 'landscape';
}

// Real-time Update Types
export interface DashboardUpdate {
  type: 'widget-data' | 'widget-config' | 'layout-change' | 'filter-change';
  dashboardId: string;
  pageId?: string;
  widgetId?: string;
  data: any;
  timestamp: number;
}

export interface CollaborationEvent {
  type: 'cursor-move' | 'selection' | 'edit' | 'comment';
  userId: string;
  userName: string;
  data: any;
  timestamp: number;
}
