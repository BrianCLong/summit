# Advanced Visualization and Interactive Dashboard System

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/intelgraph/summit)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> World-class visualization platform with interactive dashboards, real-time updates, 3D capabilities, and comprehensive charting that rivals Palantir Foundry and Tableau.

## 🚀 Features

### Interactive Dashboard Framework
- ✅ **Drag-and-Drop Builder** - Intuitive dashboard creation with grid-based layout
- ✅ **Widget Library** - 10+ pre-built widgets (charts, maps, tables, metrics, timelines)
- ✅ **Multi-Page Dashboards** - Organize complex visualizations across pages
- ✅ **Real-Time Collaboration** - Multiple users editing simultaneously
- ✅ **Version Control** - Dashboard versioning and rollback capabilities
- ✅ **Export & Share** - Export to PDF, PNG, PowerPoint

### Advanced Charting
- ✅ **20+ Chart Types** - Line, bar, pie, scatter, heatmap, treemap, sankey, and more
- ✅ **D3.js Integration** - Custom visualizations with full D3.js power
- ✅ **Animated Transitions** - Smooth animations for data updates
- ✅ **Interactive Features** - Zoom, pan, brush, hover, click interactions
- ✅ **Responsive Design** - Adapts to any screen size

### Geospatial Visualization
- ✅ **Interactive Maps** - Mapbox, Leaflet, Deck.gl integration
- ✅ **Choropleth Maps** - Regional data visualization
- ✅ **Heat Maps** - Density visualization
- ✅ **Route Visualization** - Path and journey mapping
- ✅ **3D Terrain** - Elevation and building visualization

### Network Graph Visualization
- ✅ **Force-Directed Layouts** - Physics-based graph layouts
- ✅ **Hierarchical Layouts** - Tree and hierarchy visualization
- ✅ **Community Detection** - Automatic clustering
- ✅ **Large Graphs** - Support for 100K+ nodes
- ✅ **Path Analysis** - Shortest path, centrality measures

### Real-Time Data Streaming
- ✅ **WebSocket Support** - Live data updates
- ✅ **Server-Sent Events** - Fallback for older browsers
- ✅ **Incremental Updates** - Efficient data streaming
- ✅ **Playback Controls** - Pause, rewind, fast-forward
- ✅ **Connection Resilience** - Automatic reconnection

### 3D and Immersive Visualizations
- ✅ **3D Scatter Plots** - Three-dimensional data visualization
- ✅ **Globe Visualization** - Global data on 3D globe
- ✅ **WebGL Acceleration** - High-performance rendering
- ✅ **Camera Controls** - Orbit, pan, zoom controls
- ✅ **VR/AR Ready** - Immersive analysis capabilities

### Data Exploration Tools
- ✅ **Drill-Down** - Navigate from summary to details
- ✅ **Cross-Filtering** - Coordinated views across widgets
- ✅ **Brushing & Linking** - Select data in one view, highlight in others
- ✅ **Search & Highlight** - Find and emphasize data points
- ✅ **Bookmarks** - Save and restore view states

### Performance Optimization
- ✅ **Virtual Scrolling** - Handle millions of rows
- ✅ **Data Aggregation** - Server-side aggregation
- ✅ **Progressive Rendering** - Load large visualizations incrementally
- ✅ **Web Workers** - Off-main-thread computation
- ✅ **Caching** - Smart caching strategies

## 📦 Package Structure

```
packages/
├── visualization/              # Core visualization library
├── dashboard-framework/        # Interactive dashboard system
├── charting/                  # Advanced charting library
├── map-visualization/         # Geospatial visualization
├── network-graph/             # Network graph visualization
└── 3d-visualization/          # 3D visualization capabilities

services/
└── dashboard-service/         # Backend API service

examples/
└── dashboard-templates/       # Pre-built dashboard templates

docs/
└── visualization/
    └── GUIDE.md              # Complete documentation
```

## 🚀 Quick Start

### Installation

```bash
# Install packages
pnpm install

# Build all packages
pnpm run build

# Start development servers
pnpm run dev
```

### Basic Usage

```typescript
import React from 'react';
import { DashboardBuilder } from '@intelgraph/dashboard-framework';
import { WIDGET_TEMPLATES } from '@intelgraph/dashboard-framework/widgets';

function App() {
  return (
    <DashboardBuilder
      dashboardId="my-dashboard"
      widgetTemplates={WIDGET_TEMPLATES}
      onSave={() => console.log('Dashboard saved')}
    />
  );
}
```

### Creating a Dashboard Programmatically

```typescript
import { useDashboardStore } from '@intelgraph/dashboard-framework';

function setupDashboard() {
  const { createDashboard, createPage, addWidget } = useDashboardStore();

  // Create dashboard
  const dashboardId = createDashboard({
    name: 'Executive Dashboard',
    description: 'Key metrics and KPIs',
    pages: [],
  });

  // Create page
  const pageId = createPage(dashboardId, {
    name: 'Overview',
    layout: { type: 'grid', columns: 12, rowHeight: 80 },
    widgets: [],
  });

  // Add widgets
  addWidget(pageId, {
    type: 'metric',
    title: 'Total Revenue',
    config: {
      value: '$2.5M',
      trend: { value: 12.5, direction: 'up' },
    },
    layout: { x: 0, y: 0, w: 3, h: 2 },
  });

  return dashboardId;
}
```

## 📚 Documentation

- **[Complete Guide](docs/visualization/GUIDE.md)** - Comprehensive documentation
- **[API Reference](docs/api/)** - Detailed API documentation
- **[Examples](examples/)** - Sample dashboards and code examples
- **[Architecture](ARCHITECTURE_SUMMARY.md)** - System architecture overview

## 🎯 Key Capabilities

### Dashboard Templates

Choose from pre-built templates:
- **Executive Dashboard** - KPIs and business metrics
- **Threat Intelligence** - Security threat monitoring
- **Network Analysis** - Entity relationship analysis
- **Financial Analytics** - Financial data visualization
- **Operational Metrics** - Operations monitoring

### Widget Types

| Widget | Description | Use Case |
|--------|-------------|----------|
| **Metric Card** | Display KPIs with trends | Revenue, users, conversion rate |
| **Line Chart** | Time-series trends | Revenue over time, user growth |
| **Bar Chart** | Category comparison | Sales by region, products |
| **Pie Chart** | Proportions | Market share, category breakdown |
| **Heat Map** | Intensity patterns | Activity by time/location |
| **Map** | Geographic data | Store locations, threat origins |
| **Network Graph** | Relationships | Entity connections, social networks |
| **Timeline** | Temporal events | Project milestones, incidents |
| **Table** | Tabular data | Detailed records, logs |
| **3D Scatter** | 3D relationships | Multi-dimensional analysis |

## 🔧 Backend API

### GraphQL API

```graphql
# Create dashboard
mutation {
  createDashboard(input: {
    name: "My Dashboard"
    description: "Custom dashboard"
  }) {
    id
    name
  }
}

# Query dashboard
query {
  dashboard(id: "dashboard-id") {
    id
    name
    pages {
      widgets {
        id
        type
        config
      }
    }
  }
}

# Real-time subscription
subscription {
  dashboardUpdated(dashboardId: "dashboard-id") {
    id
    version
    updatedAt
  }
}
```

### REST API

```
POST   /api/dashboards              # Create dashboard
GET    /api/dashboards/:id          # Get dashboard
PUT    /api/dashboards/:id          # Update dashboard
DELETE /api/dashboards/:id          # Delete dashboard
POST   /api/dashboards/:id/export   # Export dashboard
```

## 🎨 Customization

### Custom Themes

```typescript
const customTheme = {
  name: 'Dark Mode',
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    background: '#1f2937',
    surface: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    border: '#4b5563',
    accent: ['#10b981', '#f59e0b', '#ef4444'],
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: { small: 12, medium: 14, large: 18 },
  },
};
```

### Custom Widgets

```typescript
import { Widget } from '@intelgraph/dashboard-framework';

function CustomWidget({ config }: { config: any }) {
  return (
    <div className="custom-widget">
      {/* Your custom visualization */}
    </div>
  );
}

// Register custom widget
registerWidget('custom', CustomWidget);
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm test --filter @intelgraph/dashboard-framework

# Run with coverage
pnpm test --coverage
```

## 📈 Performance

- **Handles 100K+ nodes** in network graphs
- **Millions of rows** with virtual scrolling
- **Real-time updates** at 60 FPS
- **Sub-second load times** for dashboards
- **Optimized bundle size** with code splitting

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

Built with:
- React 18.3+ for UI
- D3.js for visualizations
- Zustand for state management
- react-grid-layout for drag & drop
- Three.js for 3D graphics
- Mapbox/Deck.gl for maps
- Apollo GraphQL for API
- TypeScript for type safety

## 📞 Support

- **Documentation**: [docs.intelgraph.com](https://docs.intelgraph.com)
- **Issues**: [GitHub Issues](https://github.com/intelgraph/summit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/intelgraph/summit/discussions)
- **Email**: support@intelgraph.com

---

**Built with ❤️ by the IntelGraph Team**
