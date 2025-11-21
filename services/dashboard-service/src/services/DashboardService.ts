import { v4 as uuidv4 } from 'uuid';

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  pages: DashboardPage[];
  theme?: any;
  permissions?: any;
  metadata?: any;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardPage {
  id: string;
  name: string;
  layout: any;
  widgets: Widget[];
  filters?: any[];
  order: number;
}

export interface Widget {
  id: string;
  type: string;
  title: string;
  config: any;
  layout: any;
  dataSource?: any;
  interactions?: any;
  style?: any;
}

export class DashboardService {
  private dashboards: Map<string, Dashboard> = new Map();
  private widgetTemplates: any[] = [];

  constructor() {
    this.initializeTemplates();
    this.initializeSampleDashboards();
  }

  private initializeTemplates() {
    this.widgetTemplates = [
      {
        id: 'metric-card',
        name: 'Metric Card',
        description: 'Display a key metric with optional trend',
        type: 'metric',
        category: 'metric',
        icon: '📊',
        defaultConfig: { value: 0, label: 'Metric' },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
        tags: ['metric', 'kpi'],
      },
      {
        id: 'bar-chart',
        name: 'Bar Chart',
        description: 'Compare values across categories',
        type: 'chart',
        category: 'chart',
        icon: '📊',
        defaultConfig: { chartType: 'bar' },
        defaultLayout: { x: 0, y: 0, w: 6, h: 4 },
        tags: ['chart', 'bar'],
      },
      {
        id: 'line-chart',
        name: 'Line Chart',
        description: 'Show trends over time',
        type: 'chart',
        category: 'chart',
        icon: '📈',
        defaultConfig: { chartType: 'line' },
        defaultLayout: { x: 0, y: 0, w: 6, h: 4 },
        tags: ['chart', 'line', 'trend'],
      },
      {
        id: 'data-table',
        name: 'Data Table',
        description: 'Display data in tabular format',
        type: 'table',
        category: 'table',
        icon: '📋',
        defaultConfig: { columns: [], sortable: true },
        defaultLayout: { x: 0, y: 0, w: 8, h: 6 },
        tags: ['table', 'data'],
      },
      {
        id: 'map',
        name: 'Map',
        description: 'Display geographic data',
        type: 'map',
        category: 'map',
        icon: '🗺️',
        defaultConfig: { mapType: 'points' },
        defaultLayout: { x: 0, y: 0, w: 8, h: 6 },
        tags: ['map', 'geography'],
      },
      {
        id: 'network-graph',
        name: 'Network Graph',
        description: 'Visualize node relationships',
        type: 'network',
        category: 'network',
        icon: '🕸️',
        defaultConfig: { layout: 'force' },
        defaultLayout: { x: 0, y: 0, w: 8, h: 6 },
        tags: ['network', 'graph'],
      },
      {
        id: 'timeline',
        name: 'Timeline',
        description: 'Display events over time',
        type: 'timeline',
        category: 'timeline',
        icon: '⏰',
        defaultConfig: { startField: 'start', labelField: 'label' },
        defaultLayout: { x: 0, y: 0, w: 12, h: 4 },
        tags: ['timeline', 'events'],
      },
    ];
  }

  private initializeSampleDashboards() {
    const sampleDashboard: Dashboard = {
      id: 'sample-1',
      name: 'Sample Dashboard',
      description: 'A sample dashboard to get started',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      pages: [
        {
          id: 'page-1',
          name: 'Overview',
          order: 0,
          layout: { type: 'grid', columns: 12, rowHeight: 80 },
          widgets: [
            {
              id: 'widget-1',
              type: 'metric',
              title: 'Total Users',
              config: { value: '1,234', label: 'Total Users', trend: { value: 12, direction: 'up' } },
              layout: { x: 0, y: 0, w: 3, h: 2 },
            },
            {
              id: 'widget-2',
              type: 'chart',
              title: 'Activity Trend',
              config: { chartType: 'line' },
              layout: { x: 3, y: 0, w: 9, h: 4 },
            },
          ],
        },
      ],
    };

    this.dashboards.set(sampleDashboard.id, sampleDashboard);
  }

  async listDashboards(filter?: any): Promise<Dashboard[]> {
    let dashboards = Array.from(this.dashboards.values());

    if (filter?.category) {
      dashboards = dashboards.filter(d => d.metadata?.category === filter.category);
    }

    if (filter?.tags) {
      dashboards = dashboards.filter(d =>
        filter.tags.some((tag: string) => d.metadata?.tags?.includes(tag))
      );
    }

    return dashboards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    return this.dashboards.get(id) || null;
  }

  async createDashboard(input: Partial<Dashboard>): Promise<Dashboard> {
    const id = uuidv4();
    const now = new Date();

    const dashboard: Dashboard = {
      id,
      name: input.name || 'Untitled Dashboard',
      description: input.description,
      pages: input.pages || [
        {
          id: uuidv4(),
          name: 'Page 1',
          order: 0,
          layout: { type: 'grid', columns: 12, rowHeight: 80 },
          widgets: [],
        },
      ],
      theme: input.theme,
      permissions: input.permissions,
      metadata: input.metadata,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.dashboards.set(id, dashboard);
    return dashboard;
  }

  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    const existing = this.dashboards.get(id);
    if (!existing) {
      throw new Error('Dashboard not found');
    }

    const updated: Dashboard = {
      ...existing,
      ...updates,
      id,
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    this.dashboards.set(id, updated);
    return updated;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    return this.dashboards.delete(id);
  }

  async duplicateDashboard(id: string): Promise<Dashboard> {
    const existing = await this.getDashboard(id);
    if (!existing) {
      throw new Error('Dashboard not found');
    }

    return this.createDashboard({
      ...existing,
      name: `${existing.name} (Copy)`,
    });
  }

  async exportDashboard(id: string, format: string): Promise<string> {
    const dashboard = await this.getDashboard(id);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    // In production, this would generate and store the export file
    // and return a download URL
    return `/exports/${id}.${format}`;
  }

  async getWidgetTemplates(category?: string): Promise<any[]> {
    if (category) {
      return this.widgetTemplates.filter(t => t.category === category);
    }
    return this.widgetTemplates;
  }

  // Widget operations
  async addWidget(pageId: string, dashboardId: string, widget: Partial<Widget>): Promise<Widget> {
    const dashboard = await this.getDashboard(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    const page = dashboard.pages.find(p => p.id === pageId);
    if (!page) throw new Error('Page not found');

    const newWidget: Widget = {
      id: uuidv4(),
      type: widget.type || 'metric',
      title: widget.title || 'New Widget',
      config: widget.config || {},
      layout: widget.layout || { x: 0, y: 0, w: 4, h: 3 },
      dataSource: widget.dataSource,
      interactions: widget.interactions,
      style: widget.style,
    };

    page.widgets.push(newWidget);
    dashboard.updatedAt = new Date();
    dashboard.version++;

    return newWidget;
  }

  async updateWidget(widgetId: string, dashboardId: string, updates: Partial<Widget>): Promise<Widget> {
    const dashboard = await this.getDashboard(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    for (const page of dashboard.pages) {
      const widget = page.widgets.find(w => w.id === widgetId);
      if (widget) {
        Object.assign(widget, updates);
        dashboard.updatedAt = new Date();
        dashboard.version++;
        return widget;
      }
    }

    throw new Error('Widget not found');
  }

  async deleteWidget(widgetId: string, dashboardId: string): Promise<boolean> {
    const dashboard = await this.getDashboard(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    for (const page of dashboard.pages) {
      const index = page.widgets.findIndex(w => w.id === widgetId);
      if (index !== -1) {
        page.widgets.splice(index, 1);
        dashboard.updatedAt = new Date();
        dashboard.version++;
        return true;
      }
    }

    return false;
  }
}
