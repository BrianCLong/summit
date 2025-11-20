# Summit Analytics Dashboard Platform - User Guide

## Overview

The Summit Analytics Dashboard Platform is a comprehensive data visualization and analytics solution that rivals and surpasses specialized tools like Tableau and PowerBI. It provides enterprise-grade interactive dashboards, custom visualizations, geospatial mapping, network graphs, and collaborative analytics capabilities specifically designed for intelligence operations.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Basics](#dashboard-basics)
3. [Creating Your First Dashboard](#creating-your-first-dashboard)
4. [Working with Widgets](#working-with-widgets)
5. [Chart Types and Visualizations](#chart-types-and-visualizations)
6. [Geospatial Visualization](#geospatial-visualization)
7. [Network and Graph Visualization](#network-and-graph-visualization)
8. [Time-Series Analysis](#time-series-analysis)
9. [Statistical Visualizations](#statistical-visualizations)
10. [Dashboard Collaboration](#dashboard-collaboration)
11. [Real-Time Data Streaming](#real-time-data-streaming)
12. [Sharing and Permissions](#sharing-and-permissions)
13. [Exporting and Embedding](#exporting-and-embedding)
14. [Performance Optimization](#performance-optimization)

---

## Getting Started

### Installation

The visualization platform is integrated into Summit. To start using it:

```bash
# Install dependencies
pnpm install

# Start the dashboard service
pnpm --filter @intelgraph/dashboard-service dev

# Start the visualization service (optional, for advanced rendering)
pnpm --filter @intelgraph/visualization-service dev

# Access dashboards through the main Summit application
# Navigate to /dashboards in the web interface
```

### Quick Start

1. **Access Dashboards**: Navigate to the Dashboards section in Summit
2. **Create Dashboard**: Click "New Dashboard" or select from templates
3. **Add Widgets**: Drag widgets from the widget library onto your dashboard
4. **Configure Data**: Connect widgets to data sources and configure visualizations
5. **Customize**: Apply themes, layouts, and styling
6. **Share**: Set permissions and share with your team

---

## Dashboard Basics

### Dashboard Components

A dashboard consists of:

- **Widgets**: Individual visualization or content blocks (charts, metrics, tables, maps)
- **Filters**: Dashboard-level filters that affect multiple widgets
- **Layout**: Grid-based responsive layout system
- **Theme**: Visual styling (colors, fonts, backgrounds)
- **Settings**: Configuration options (refresh intervals, time zones, formats)

### Dashboard Types

- **Personal Dashboards**: Private dashboards for individual use
- **Team Dashboards**: Shared dashboards with collaboration features
- **Public Dashboards**: Read-only dashboards accessible without authentication
- **Embedded Dashboards**: Dashboards embedded in external applications

---

## Creating Your First Dashboard

### Method 1: From Scratch

```typescript
import { DashboardCanvas } from '@summit/dashboard-builder';

const myDashboard = {
  id: 'unique-id',
  name: 'Intelligence Operations Overview',
  description: 'Real-time overview of ongoing operations',
  widgets: [],
  filters: [],
  layout: {
    cols: 12,
    rowHeight: 30,
    compactType: 'vertical',
    preventCollision: false,
  },
  theme: {
    name: 'dark',
    backgroundColor: '#1a1a1a',
    cardBackgroundColor: '#2d2d2d',
    textColor: '#ffffff',
    accentColor: '#1976d2',
    gridColor: '#404040',
    fontFamily: 'Roboto, sans-serif',
  },
  settings: {
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    timezone: 'America/New_York',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    numberFormat: '0,0.00',
  },
  permissions: {
    ownerId: 'user-id',
    isPublic: false,
    sharedWith: [],
  },
  metadata: {
    tags: ['intelligence', 'operations', 'real-time'],
    category: 'operational',
    version: 1,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Render dashboard
<DashboardCanvas dashboard={myDashboard} editable={true} />
```

### Method 2: From Template

```graphql
mutation CreateFromTemplate {
  createDashboardFromTemplate(
    templateId: "intel-ops-template"
    name: "My Intelligence Dashboard"
  ) {
    id
    name
    widgets {
      id
      title
      type
    }
  }
}
```

### Method 3: Using GraphQL API

```graphql
mutation CreateDashboard {
  createDashboard(
    input: {
      name: "Threat Analysis Dashboard"
      description: "Real-time threat intelligence monitoring"
      isPublic: false
      layout: {
        cols: 12
        rowHeight: 30
        compactType: "vertical"
      }
      settings: {
        autoRefresh: true
        refreshInterval: 60000
        timezone: "UTC"
      }
      metadata: {
        tags: ["threat-intel", "security"]
        category: "security"
      }
    }
  ) {
    id
    name
    createdAt
  }
}
```

---

## Working with Widgets

### Adding Widgets

#### Via Dashboard Builder UI

1. Click "Add Widget" button
2. Select widget type (Chart, Metric, Table, Map, etc.)
3. Configure widget properties
4. Position and resize using drag-and-drop

#### Programmatically

```graphql
mutation AddWidget {
  createWidget(
    input: {
      dashboardId: "dashboard-id"
      type: CHART
      title: "Entity Timeline"
      description: "Timeline of entity activities"
      config: {
        chartType: "line"
        dataSource: "entities-query"
        xField: "timestamp"
        yField: "count"
        refreshInterval: 30000
      }
      layout: {
        i: "widget-1"
        x: 0
        y: 0
        w: 6
        h: 8
        minW: 4
        minH: 6
      }
    }
  ) {
    id
    title
  }
}
```

### Widget Types

#### 1. Chart Widget

Displays various chart types (line, bar, scatter, pie, area, heatmap):

```typescript
{
  type: 'chart',
  config: {
    chartType: 'line',
    dataSource: 'query-id',
    xField: 'timestamp',
    yField: 'value',
    groupBy: 'category',
    filters: {
      dateRange: 'last-7-days'
    },
    refreshInterval: 60000
  }
}
```

#### 2. Metric Widget

Displays key performance indicators:

```typescript
{
  type: 'metric',
  config: {
    dataSource: 'metrics-query',
    metric: 'total_entities',
    format: 'number',
    showTrend: true,
    trendPeriod: 'day',
    thresholds: [
      { value: 1000, color: '#4caf50', operator: 'gte' },
      { value: 500, color: '#ff9800', operator: 'gte' },
      { value: 0, color: '#f44336', operator: 'gte' }
    ]
  }
}
```

#### 3. Table Widget

Displays tabular data with sorting and filtering:

```typescript
{
  type: 'table',
  config: {
    dataSource: 'table-query',
    columns: [
      { field: 'name', header: 'Name', sortable: true, filterable: true },
      { field: 'value', header: 'Value', sortable: true, format: '0,0.00' },
      { field: 'timestamp', header: 'Time', format: 'YYYY-MM-DD HH:mm' }
    ],
    pageSize: 25,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  }
}
```

#### 4. Map Widget

Displays geospatial data:

```typescript
{
  type: 'map',
  config: {
    dataSource: 'geo-query',
    mapType: 'choropleth', // or 'heatmap', 'points', 'trajectories'
    latField: 'latitude',
    lonField: 'longitude',
    valueField: 'intensity',
    clustering: true,
    baseLayer: 'satellite'
  }
}
```

---

## Chart Types and Visualizations

### Line Charts

Perfect for time-series data and trends:

```typescript
import { LineChart } from '@summit/chart-components';

const data = [
  { x: new Date('2024-01-01'), y: 100, label: 'Point 1' },
  { x: new Date('2024-01-02'), y: 150, label: 'Point 2' },
  { x: new Date('2024-01-03'), y: 120, label: 'Point 3' },
];

<LineChart
  data={data}
  config={{
    width: 800,
    height: 400,
    showPoints: true,
    curved: true,
    fillArea: true,
    fillOpacity: 0.2,
    xAxis: {
      label: 'Date',
      showGrid: true,
    },
    yAxis: {
      label: 'Count',
      showGrid: true,
    },
    theme: {
      accentColor: '#1976d2',
    },
    animation: {
      enabled: true,
      duration: 750,
    },
    tooltip: {
      enabled: true,
    },
  }}
/>
```

### Bar Charts

Ideal for categorical comparisons:

```typescript
import { BarChart } from '@summit/chart-components';

const data = [
  { x: 'Category A', y: 45, color: '#1976d2' },
  { x: 'Category B', y: 67, color: '#dc004e' },
  { x: 'Category C', y: 89, color: '#9c27b0' },
];

<BarChart
  data={data}
  config={{
    orientation: 'vertical',
    barPadding: 0.1,
    xAxis: { label: 'Categories' },
    yAxis: { label: 'Values' },
  }}
/>
```

### Interactive Features

All charts support:

- **Tooltips**: Hover to see detailed information
- **Zooming**: Mouse wheel or pinch to zoom
- **Panning**: Click and drag to pan
- **Brushing**: Select ranges for detailed analysis
- **Cross-filtering**: Click elements to filter other widgets
- **Drill-down**: Click to navigate to detailed views

---

## Geospatial Visualization

### Map Layers

```typescript
import { GeoMap } from '@summit/geospatial-viz';

<GeoMap
  config={{
    center: [37.7749, -122.4194], // San Francisco
    zoom: 10,
    layers: [
      {
        type: 'heatmap',
        data: heatmapData,
        intensity: 'value',
        radius: 20,
      },
      {
        type: 'points',
        data: pointsData,
        clustering: true,
        clusterRadius: 50,
      },
      {
        type: 'choropleth',
        data: regionData,
        colorScale: 'viridis',
        valueField: 'density',
      },
    ],
  }}
/>
```

### Trajectory Visualization

```typescript
<TrajectoryMap
  trajectories={[
    {
      id: 'route-1',
      points: [
        { lat: 37.7749, lon: -122.4194, timestamp: '2024-01-01T00:00:00Z' },
        { lat: 37.8049, lon: -122.4094, timestamp: '2024-01-01T01:00:00Z' },
      ],
      color: '#1976d2',
      animated: true,
    },
  ]}
/>
```

---

## Network and Graph Visualization

### Force-Directed Graphs

```typescript
import { NetworkGraph } from '@summit/network-viz';

<NetworkGraph
  data={{
    nodes: [
      { id: 'node1', label: 'Entity A', group: 'type1' },
      { id: 'node2', label: 'Entity B', group: 'type2' },
    ],
    edges: [
      { source: 'node1', target: 'node2', weight: 10, type: 'connected' },
    ],
  }}
  config={{
    layout: 'force-directed',
    layoutOptions: {
      strength: -30,
      distance: 100,
    },
    nodeSize: d => d.weight * 5,
    edgeWidth: d => d.weight,
    interactive: true,
    showLabels: true,
  }}
/>
```

### Hierarchical Trees

```typescript
<HierarchyTree
  data={treeData}
  config={{
    layout: 'tree',
    orientation: 'horizontal',
    nodeSpacing: 50,
    levelSpacing: 150,
  }}
/>
```

---

## Time-Series Analysis

### Multi-Series Charts

```typescript
import { TimeSeriesChart } from '@summit/timeseries-viz';

<TimeSeriesChart
  series={[
    { name: 'Series A', data: dataA, color: '#1976d2' },
    { name: 'Series B', data: dataB, color: '#dc004e' },
    { name: 'Series C', data: dataC, color: '#9c27b0' },
  ]}
  config={{
    brushing: true,
    zooming: true,
    legend: { position: 'right' },
    annotations: [
      { timestamp: '2024-01-15', label: 'Event', color: 'red' },
    ],
  }}
/>
```

### Event Timelines

```typescript
<EventTimeline
  events={[
    { id: 'e1', start: '2024-01-01', end: '2024-01-05', label: 'Operation Alpha' },
    { id: 'e2', start: '2024-01-03', end: '2024-01-07', label: 'Investigation Beta' },
  ]}
  config={{
    groups: ['operations', 'investigations'],
    timeScale: 'day',
  }}
/>
```

---

## Statistical Visualizations

### Box Plots

```typescript
import { BoxPlot } from '@summit/statistical-viz';

<BoxPlot
  data={distributionData}
  config={{
    orientation: 'vertical',
    showOutliers: true,
    whiskerType: 'iqr',
  }}
/>
```

### Scatter Plots with Regression

```typescript
<ScatterPlot
  data={scatterData}
  config={{
    showTrendLine: true,
    trendLineType: 'linear',
    confidenceInterval: 0.95,
  }}
/>
```

---

## Dashboard Collaboration

### Real-Time Collaboration

Multiple users can edit dashboards simultaneously with:

- **Live cursors**: See where other users are working
- **Real-time updates**: See changes as they happen
- **Presence indicators**: Know who's viewing the dashboard

```typescript
<DashboardCanvas
  dashboard={dashboard}
  editable={true}
  events={{
    onLayoutChange: (layout) => {
      // Broadcast layout changes via WebSocket
      socket.emit('layout-updated', { dashboardId, layout });
    },
  }}
/>
```

### Comments and Annotations

```graphql
mutation AddComment {
  createComment(
    input: {
      dashboardId: "dashboard-id"
      widgetId: "widget-id"
      content: "This trend needs investigation"
      metadata: { priority: "high" }
    }
  ) {
    id
    content
    createdAt
  }
}
```

---

## Real-Time Data Streaming

### WebSocket Integration

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:4001');

socket.on('connect', () => {
  socket.emit('join-dashboard', dashboardId);
});

socket.on('widget-updated', (data) => {
  // Update widget with new data
  updateWidget(data.widgetId, data.changes);
});

// Stream real-time metrics
socket.on('metric-update', (metric) => {
  updateMetric(metric.name, metric.value);
});
```

### GraphQL Subscriptions

```graphql
subscription DashboardUpdates {
  dashboardUpdated(dashboardId: "dashboard-id") {
    id
    name
    updatedAt
    widgets {
      id
      config
    }
  }
}
```

---

## Sharing and Permissions

### Permission Levels

- **Viewer**: Read-only access
- **Editor**: Can modify dashboard and widgets
- **Admin**: Full control including sharing and deletion

### Sharing a Dashboard

```graphql
mutation ShareDashboard {
  shareDashboard(
    input: {
      dashboardId: "dashboard-id"
      userId: "recipient-user-id"
      role: EDITOR
    }
  )
}
```

### Public Dashboards

```graphql
mutation MakePublic {
  updateDashboard(
    id: "dashboard-id"
    input: { isPublic: true }
  ) {
    id
    isPublic
  }
}
```

---

## Exporting and Embedding

### Export Formats

- **PDF**: High-quality printable reports
- **PNG**: Image snapshots
- **SVG**: Vector graphics for scalability
- **JSON**: Dashboard configuration
- **CSV**: Tabular data export

```typescript
// Export dashboard
const exportDashboard = async (format: 'pdf' | 'png' | 'json') => {
  const response = await fetch('/api/dashboards/export', {
    method: 'POST',
    body: JSON.stringify({ dashboardId, format }),
  });
  const blob = await response.blob();
  // Download or process blob
};
```

### Embedding Dashboards

```html
<!-- Embed in iframe -->
<iframe
  src="https://summit.example.com/dashboards/embed/dashboard-id?token=embed-token"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

```typescript
// Generate embed token
mutation GenerateEmbedToken {
  generateEmbedToken(dashboardId: "dashboard-id", expiresIn: 86400) {
    token
    embedUrl
    expiresAt
  }
}
```

---

## Performance Optimization

### Best Practices

1. **Data Sampling**: Use sampling for large datasets
2. **Lazy Loading**: Load widgets on-demand
3. **Caching**: Cache query results with appropriate TTL
4. **Pagination**: Paginate table data
5. **Aggregation**: Pre-aggregate data on the server
6. **Debouncing**: Debounce filter changes
7. **Virtualization**: Virtualize large lists and tables

### Optimization Examples

```typescript
// Virtual scrolling for tables
<VirtualTable
  data={largeDataset}
  rowHeight={48}
  pageSize={50}
  virtualization={true}
/>

// Data sampling
<ScatterPlot
  data={massiveDataset}
  config={{
    sampling: {
      enabled: true,
      method: 'random',
      maxPoints: 1000,
    },
  }}
/>

// Progressive loading
<Dashboard
  loadingStrategy="progressive"
  priorityWidgets={['metric-1', 'chart-1']}
/>
```

---

## Advanced Topics

### Custom Widgets

See [CUSTOM_VIZ.md](./CUSTOM_VIZ.md) for detailed guide on creating custom widgets.

### Performance Tuning

See [BEST_PRACTICES.md](./BEST_PRACTICES.md) for optimization strategies.

---

## Troubleshooting

### Common Issues

**Dashboard not loading**
- Check network connectivity
- Verify authentication token
- Check browser console for errors

**Widgets not updating**
- Verify data source connection
- Check refresh interval settings
- Inspect WebSocket connection

**Performance issues**
- Enable data sampling
- Reduce refresh frequency
- Optimize queries
- Use pagination for large datasets

---

## API Reference

For complete API documentation, see:
- GraphQL Schema: `/services/dashboard-service/src/graphql/schema.graphql`
- TypeScript Types: `/packages/dashboard-builder/src/types.ts`
- Chart Components API: `/packages/chart-components/src/types.ts`

---

## Support and Resources

- Documentation: `/docs/visualization/`
- Examples: `/examples/dashboards/`
- Issue Tracker: GitHub Issues
- Community: Summit Slack Channel

---

## License

Summit Analytics Dashboard Platform
Copyright © 2024 IntelGraph
