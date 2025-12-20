# Dashboard Templates

This directory contains pre-built dashboard templates that can be used as starting points for creating new dashboards.

## Available Templates

### 1. Executive Dashboard (`executive-dashboard.json`)
High-level KPIs and metrics for executives

**Features:**
- Revenue, users, conversion rate, and satisfaction metrics
- Revenue trend line chart
- Revenue by category pie chart
- User growth area chart
- Top products table

**Best for:** C-level executives, business analysts

### 2. Threat Intelligence Dashboard (`threat-intel-dashboard.json`)
Security threat monitoring and analysis

**Features:**
- Active threats metric
- Threat origins heat map
- Threat network graph
- Threat severity timeline
- Indicator breakdown table

**Best for:** Security analysts, SOC teams

### 3. Network Analysis Dashboard (`network-analysis-dashboard.json`)
Entity relationship analysis and visualization

**Features:**
- Entity network graph with clustering
- Node statistics metrics
- Community detection visualization
- Path analysis tools
- Selected nodes detail table

**Best for:** Intelligence analysts, investigators

## Usage

### Import a Template

```typescript
import { useDashboardStore } from '@intelgraph/dashboard-framework';
import executiveTemplate from './examples/dashboard-templates/executive-dashboard.json';

function importTemplate() {
  const { createDashboard } = useDashboardStore();

  const dashboardId = createDashboard({
    ...executiveTemplate,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return dashboardId;
}
```

### Customize a Template

```typescript
import template from './executive-dashboard.json';

// Modify template before importing
const customTemplate = {
  ...template,
  name: 'My Custom Dashboard',
  pages: template.pages.map(page => ({
    ...page,
    widgets: page.widgets.map(widget => ({
      ...widget,
      // Customize data sources
      dataSource: {
        ...widget.dataSource,
        endpoint: 'https://my-api.com/graphql',
      },
    })),
  })),
};
```

### Create Your Own Template

1. Build your dashboard using the Dashboard Builder
2. Export it using the export function:

```typescript
import { exportDashboard } from '@intelgraph/dashboard-framework/utils';

const template = await exportDashboard(dashboardId, {
  format: 'json',
  includeData: false,  // Don't include actual data
});

// Save to file
const blob = new Blob([JSON.stringify(template, null, 2)], {
  type: 'application/json',
});
```

3. Add it to this directory

## Template Structure

```json
{
  "name": "Dashboard Name",
  "description": "Dashboard description",
  "category": "business|security|analytics|custom",
  "pages": [
    {
      "id": "page-id",
      "name": "Page Name",
      "order": 0,
      "layout": {
        "type": "grid",
        "columns": 12,
        "rowHeight": 80
      },
      "widgets": [
        {
          "id": "widget-id",
          "type": "chart|metric|table|map|network|timeline",
          "title": "Widget Title",
          "config": { /* widget-specific config */ },
          "layout": {
            "x": 0,
            "y": 0,
            "w": 6,
            "h": 4,
            "minW": 4,
            "minH": 3
          },
          "dataSource": {
            "type": "graphql|rest|websocket|static",
            "query": "GraphQL query or REST endpoint",
            "refreshInterval": 300000
          }
        }
      ]
    }
  ]
}
```

## Best Practices

1. **Use Descriptive Names**: Give clear, descriptive names to dashboards and widgets
2. **Set Appropriate Refresh Intervals**: Balance between freshness and performance
3. **Configure Minimum Sizes**: Set minW and minH to prevent widgets from being too small
4. **Add Data Sources**: Include data source configurations for easy customization
5. **Document Custom Fields**: Add comments for custom configurations
6. **Test Responsiveness**: Ensure templates work on different screen sizes
7. **Include Metadata**: Add category, tags, and descriptions for searchability

## Contributing

To contribute a new template:

1. Create your dashboard in the Dashboard Builder
2. Test it thoroughly across different scenarios
3. Export it as JSON
4. Add documentation to this README
5. Submit a pull request

## Support

For questions or issues with templates:
- Open an issue on GitHub
- Check the main documentation at `/docs/visualization/GUIDE.md`
- Join our community Slack channel
