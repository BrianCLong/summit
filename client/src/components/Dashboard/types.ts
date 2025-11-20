/**
 * Dashboard Type Definitions
 */

export type WidgetType =
  | 'threat-monitor'
  | 'geospatial'
  | 'timeline'
  | 'network-graph'
  | 'alerts'
  | 'investigation-list'
  | 'activity-feed'
  | 'metrics'
  | 'entity-search'
  | 'team-presence'
  | 'case-summary'
  | 'threat-intel'
  | 'chart'
  | 'custom';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  config: WidgetConfig;
  layout: WidgetLayout;
  permissions?: WidgetPermissions;
  refreshInterval?: number; // milliseconds
  lastUpdated?: number;
}

export interface WidgetConfig {
  // Widget-specific configuration
  [key: string]: any;

  // Common configs
  showHeader?: boolean;
  showRefresh?: boolean;
  showSettings?: boolean;
  showFullscreen?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  dataSource?: string;
  filters?: any;
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number; // width in grid units
  h: number; // height in grid units
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean; // Cannot be moved or resized
}

export interface WidgetPermissions {
  canView: string[]; // role names
  canEdit: string[]; // role names
  canDelete: string[]; // role names
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  settings: DashboardSettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
  isShared?: boolean;
  sharedWith?: string[]; // user IDs
  tags?: string[];
}

export interface DashboardSettings {
  columns: number; // Grid columns
  rowHeight: number; // Height of one row unit in pixels
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  showGrid?: boolean;
  snapToGrid?: boolean;
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  description?: string;
  dashboards: DashboardLayout[];
  activeDashboardId: string;
  layout: 'single' | 'split-horizontal' | 'split-vertical' | 'quad';
  theme: 'light' | 'dark' | 'auto';
  monitors?: {
    primary: string; // dashboard ID
    secondary?: string;
    tertiary?: string;
    quaternary?: string;
  };
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
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  spacing: {
    unit: number;
    padding: string;
    margin: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
    };
  };
}

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  columns: 12,
  rowHeight: 60,
  compactType: 'vertical',
  preventCollision: false,
  isDraggable: true,
  isResizable: true,
  theme: 'dark',
  autoRefresh: false,
  refreshInterval: 30000,
  showGrid: true,
  snapToGrid: true,
};

export const WIDGET_TEMPLATES: Record<WidgetType, Partial<Widget>> = {
  'threat-monitor': {
    type: 'threat-monitor',
    title: 'Threat Monitor',
    description: 'Real-time threat intelligence monitoring',
    config: {
      showHeader: true,
      showRefresh: true,
      dataSource: 'threat-intel',
    },
    layout: { x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
  },
  'geospatial': {
    type: 'geospatial',
    title: 'Geospatial View',
    description: 'Geographic intelligence visualization',
    config: {
      showHeader: true,
      mapType: 'terrain',
    },
    layout: { x: 0, y: 0, w: 8, h: 6, minW: 6, minH: 4 },
  },
  'timeline': {
    type: 'timeline',
    title: 'Timeline Analysis',
    description: 'Temporal event analysis',
    config: {
      showHeader: true,
      timeRange: '24h',
    },
    layout: { x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 3 },
  },
  'network-graph': {
    type: 'network-graph',
    title: 'Network Analysis',
    description: 'Entity relationship visualization',
    config: {
      showHeader: true,
      layout: 'force-directed',
    },
    layout: { x: 0, y: 0, w: 8, h: 6, minW: 6, minH: 4 },
  },
  'alerts': {
    type: 'alerts',
    title: 'Alerts & Notifications',
    description: 'Active alerts and notifications',
    config: {
      showHeader: true,
      filterByPriority: ['high', 'critical'],
    },
    layout: { x: 0, y: 0, w: 4, h: 5, minW: 3, minH: 4 },
  },
  'investigation-list': {
    type: 'investigation-list',
    title: 'Active Investigations',
    description: 'Current investigation cases',
    config: {
      showHeader: true,
      statusFilter: ['active', 'pending'],
    },
    layout: { x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
  },
  'activity-feed': {
    type: 'activity-feed',
    title: 'Activity Feed',
    description: 'Team activity stream',
    config: {
      showHeader: true,
      maxItems: 50,
    },
    layout: { x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
  },
  'metrics': {
    type: 'metrics',
    title: 'Key Metrics',
    description: 'System and investigation metrics',
    config: {
      showHeader: true,
      metrics: ['entities', 'relationships', 'investigations'],
    },
    layout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  },
  'entity-search': {
    type: 'entity-search',
    title: 'Entity Search',
    description: 'Quick entity lookup',
    config: {
      showHeader: true,
    },
    layout: { x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
  },
  'team-presence': {
    type: 'team-presence',
    title: 'Team Presence',
    description: 'Active team members',
    config: {
      showHeader: true,
      showActivity: true,
    },
    layout: { x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
  },
  'case-summary': {
    type: 'case-summary',
    title: 'Case Summary',
    description: 'Investigation case overview',
    config: {
      showHeader: true,
    },
    layout: { x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
  },
  'threat-intel': {
    type: 'threat-intel',
    title: 'Threat Intelligence',
    description: 'External threat intelligence feeds',
    config: {
      showHeader: true,
      feeds: ['mitre', 'osint', 'iocs'],
    },
    layout: { x: 0, y: 0, w: 5, h: 5, minW: 4, minH: 4 },
  },
  'chart': {
    type: 'chart',
    title: 'Chart',
    description: 'Data visualization chart',
    config: {
      showHeader: true,
      chartType: 'line',
    },
    layout: { x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
  },
  'custom': {
    type: 'custom',
    title: 'Custom Widget',
    description: 'Custom widget',
    config: {
      showHeader: true,
    },
    layout: { x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  },
};
