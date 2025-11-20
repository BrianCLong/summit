# Creating Custom Visualizations - Developer Guide

## Overview

The Summit Analytics Platform provides a powerful SDK for creating custom visualizations and widgets. This guide covers everything you need to know to build, test, and deploy custom visualizations that integrate seamlessly with the dashboard builder.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Creating Custom Charts](#creating-custom-charts)
4. [Creating Custom Widgets](#creating-custom-widgets)
5. [Data Integration](#data-integration)
6. [Theming and Styling](#theming-and-styling)
7. [Interactivity](#interactivity)
8. [Testing](#testing)
9. [Publishing](#publishing)
10. [Examples](#examples)

---

## Architecture Overview

### Visualization Stack

```
┌─────────────────────────────────────┐
│     Dashboard Builder UI             │
│  (@summit/dashboard-builder)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Visualization SDK                │
│  (@summit/visualization-sdk)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Specific Viz Packages            │
│  - Chart Components                  │
│  - Network Viz                       │
│  - Geospatial Viz                    │
│  - Statistical Viz                   │
│  - YOUR CUSTOM VIZ                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     D3.js / Rendering Libraries      │
└──────────────────────────────────────┘
```

### Component Lifecycle

1. **Registration**: Widget registered in SDK
2. **Instantiation**: Widget created with config
3. **Data Binding**: Data source connected
4. **Rendering**: Initial render
5. **Updates**: React to data/config changes
6. **Cleanup**: Dispose of resources

---

## Development Setup

### Prerequisites

```bash
# Node.js 18+
node --version

# pnpm package manager
npm install -g pnpm

# TypeScript
npm install -g typescript
```

### Create a Custom Viz Package

```bash
# Create package directory
mkdir -p packages/my-custom-viz/src

# Initialize package
cd packages/my-custom-viz

# Create package.json
cat > package.json << EOF
{
  "name": "@summit/my-custom-viz",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "@summit/visualization-sdk": "workspace:*",
    "d3": "^7.9.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/d3": "^7.4.3",
    "typescript": "^5.9.3"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
EOF

# Install dependencies
pnpm install
```

---

## Creating Custom Charts

### Basic Custom Chart Component

```typescript
// src/MyCustomChart.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { z } from 'zod';

// Define data schema
export const MyChartDataSchema = z.array(
  z.object({
    category: z.string(),
    value: z.number(),
    metadata: z.record(z.unknown()).optional(),
  })
);

export type MyChartData = z.infer<typeof MyChartDataSchema>;

// Define config schema
export const MyChartConfigSchema = z.object({
  width: z.number().default(800),
  height: z.number().default(400),
  colors: z.array(z.string()).default(['#1976d2', '#dc004e']),
  showLabels: z.boolean().default(true),
  animate: z.boolean().default(true),
});

export type MyChartConfig = z.infer<typeof MyChartConfigSchema>;

export interface MyCustomChartProps {
  data: MyChartData;
  config?: Partial<MyChartConfig>;
  onDataPointClick?: (data: any) => void;
}

export const MyCustomChart: React.FC<MyCustomChartProps> = ({
  data,
  config = {},
  onDataPointClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Parse and validate config
  const cfg = MyChartConfigSchema.parse({
    ...config,
    width: config.width ?? 800,
    height: config.height ?? 400,
  });

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG container
    const svg = d3
      .select(svgRef.current)
      .attr('width', cfg.width)
      .attr('height', cfg.height);

    // Define margins
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = cfg.width - margin.left - margin.right;
    const height = cfg.height - margin.top - margin.bottom;

    // Create chart group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(data.map(d => d.category))
      .range([0, width])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .range([height, 0])
      .nice();

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(data.map(d => d.category))
      .range(cfg.colors);

    // Add axes
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale));

    // Draw bars
    const bars = g
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.category) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', height)
      .attr('height', 0)
      .attr('fill', d => colorScale(d.category))
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        if (onDataPointClick) {
          onDataPointClick(d);
        }
      })
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 1);
      });

    // Animate if enabled
    if (cfg.animate) {
      bars
        .transition()
        .duration(750)
        .attr('y', d => yScale(d.value))
        .attr('height', d => height - yScale(d.value));
    } else {
      bars
        .attr('y', d => yScale(d.value))
        .attr('height', d => height - yScale(d.value));
    }

    // Add labels if enabled
    if (cfg.showLabels) {
      g.selectAll('.label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => (xScale(d.category) || 0) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.value) - 5)
        .attr('text-anchor', 'middle')
        .text(d => d.value)
        .style('font-size', '12px')
        .style('fill', '#333');
    }

  }, [data, cfg, onDataPointClick]);

  return <svg ref={svgRef} />;
};
```

### Registering Your Chart

```typescript
// src/index.ts
import { MyCustomChart, MyChartConfigSchema, MyChartDataSchema } from './MyCustomChart';

export const MyCustomChartWidget = {
  type: 'my-custom-chart',
  name: 'My Custom Chart',
  description: 'A custom chart visualization',
  component: MyCustomChart,
  configSchema: MyChartConfigSchema,
  dataSchema: MyChartDataSchema,
  defaultConfig: {
    width: 800,
    height: 400,
    colors: ['#1976d2', '#dc004e'],
    showLabels: true,
    animate: true,
  },
};

export { MyCustomChart };
```

---

## Creating Custom Widgets

### Widget Template

```typescript
// src/widgets/MyCustomWidget.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import type { DashboardWidget } from '@summit/dashboard-builder';

export interface MyCustomWidgetProps {
  widget: DashboardWidget;
  data?: any;
  loading?: boolean;
  error?: Error;
  onUpdate?: (updates: Partial<DashboardWidget>) => void;
}

export const MyCustomWidget: React.FC<MyCustomWidgetProps> = ({
  widget,
  data,
  loading,
  error,
  onUpdate,
}) => {
  const [localState, setLocalState] = useState<any>(null);

  useEffect(() => {
    // Process data when it changes
    if (data) {
      setLocalState(processData(data));
    }
  }, [data]);

  const processData = (rawData: any) => {
    // Transform data as needed
    return rawData;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography color="error">{error.message}</Typography>
      </Box>
    );
  }

  return (
    <Box width="100%" height="100%" padding={2}>
      <Typography variant="h6">{widget.title}</Typography>
      {/* Your custom widget content */}
      <Box mt={2}>
        {/* Render your visualization */}
      </Box>
    </Box>
  );
};

// Widget registration
export const MyCustomWidgetRegistration = {
  type: 'my-custom-widget',
  name: 'My Custom Widget',
  description: 'Description of what this widget does',
  component: MyCustomWidget,
  defaultConfig: {
    // Default widget configuration
  },
  configSchema: {
    // Zod schema for configuration
  },
  icon: '📊', // Optional icon
  category: 'custom', // Widget category for organization
};
```

---

## Data Integration

### Connecting to Data Sources

```typescript
// src/hooks/useWidgetData.ts
import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from 'graphql-tag';

export function useWidgetData(dataSource: string, config: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // GraphQL query
  const WIDGET_DATA_QUERY = gql`
    query GetWidgetData($source: String!, $filters: JSON) {
      widgetData(source: $source, filters: $filters) {
        data
        metadata
      }
    }
  `;

  const { data: queryData, loading: queryLoading, error: queryError } = useQuery(
    WIDGET_DATA_QUERY,
    {
      variables: {
        source: dataSource,
        filters: config.filters,
      },
      pollInterval: config.refreshInterval,
    }
  );

  useEffect(() => {
    if (queryData) {
      setData(queryData.widgetData.data);
      setLoading(false);
    }
    if (queryError) {
      setError(queryError);
      setLoading(false);
    }
  }, [queryData, queryError]);

  return { data, loading, error };
}
```

### Real-Time Data Streaming

```typescript
// src/hooks/useRealtimeData.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useRealtimeData(widgetId: string, dataSource: string) {
  const [data, setData] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('ws://localhost:4001');

    newSocket.on('connect', () => {
      console.log('Connected to real-time data stream');
      newSocket.emit('subscribe', { widgetId, dataSource });
    });

    newSocket.on('data-update', (update: any) => {
      setData(prevData => {
        // Merge new data with existing data
        return mergeData(prevData, update);
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('unsubscribe', { widgetId, dataSource });
      newSocket.disconnect();
    };
  }, [widgetId, dataSource]);

  return { data, socket };
}

function mergeData(existing: any, update: any) {
  // Implement your data merging logic
  if (!existing) return update;
  if (Array.isArray(existing) && Array.isArray(update)) {
    return [...existing, ...update];
  }
  return { ...existing, ...update };
}
```

---

## Theming and Styling

### Using Theme Context

```typescript
// src/components/ThemedVisualization.tsx
import React from 'react';
import { useTheme } from '@mui/material/styles';
import type { DashboardTheme } from '@summit/dashboard-builder';

export const ThemedVisualization: React.FC<{ theme?: DashboardTheme }> = ({ theme }) => {
  const muiTheme = useTheme();

  // Merge dashboard theme with MUI theme
  const vizTheme = {
    backgroundColor: theme?.backgroundColor || muiTheme.palette.background.default,
    textColor: theme?.textColor || muiTheme.palette.text.primary,
    accentColor: theme?.accentColor || muiTheme.palette.primary.main,
    fontFamily: theme?.fontFamily || muiTheme.typography.fontFamily,
  };

  return (
    <div style={{
      backgroundColor: vizTheme.backgroundColor,
      color: vizTheme.textColor,
      fontFamily: vizTheme.fontFamily,
    }}>
      {/* Your visualization content */}
    </div>
  );
};
```

### Responsive Design

```typescript
// src/hooks/useResponsiveDimensions.ts
import { useState, useEffect, RefObject } from 'react';

export function useResponsiveDimensions(ref: RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(ref.current);

    return () => resizeObserver.disconnect();
  }, [ref]);

  return dimensions;
}

// Usage
const MyResponsiveChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResponsiveDimensions(containerRef);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <MyChart width={width} height={height} />
    </div>
  );
};
```

---

## Interactivity

### Adding Click Handlers

```typescript
// Handle clicks on visualization elements
const handleDataPointClick = (dataPoint: any) => {
  // Emit event for cross-filtering
  onDataPointClick?.(dataPoint);

  // Show details
  showDataPointDetails(dataPoint);

  // Navigate to drill-down view
  navigateTo(`/details/${dataPoint.id}`);
};
```

### Brushing and Zooming

```typescript
// src/components/BrushableChart.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export const BrushableChart: React.FC<{
  data: any[];
  onBrush?: (selection: [number, number] | null) => void;
}> = ({ data, onBrush }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 400;

    // Create brush
    const brush = d3
      .brushX()
      .extent([[0, 0], [width, height]])
      .on('end', (event) => {
        if (!event.selection) {
          onBrush?.(null);
          return;
        }

        const [x0, x1] = event.selection as [number, number];
        onBrush?.([x0, x1]);
      });

    // Add brush to SVG
    svg.append('g')
      .attr('class', 'brush')
      .call(brush);

  }, [data, onBrush]);

  return <svg ref={svgRef} />;
};
```

### Tooltips

```typescript
// src/components/TooltipProvider.tsx
import React, { useState, createContext, useContext } from 'react';
import { Popper, Paper, Typography } from '@mui/material';

interface TooltipContextType {
  showTooltip: (content: React.ReactNode, anchorEl: HTMLElement) => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextType>({
  showTooltip: () => {},
  hideTooltip: () => {},
});

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [content, setContent] = useState<React.ReactNode>(null);

  const showTooltip = (content: React.ReactNode, el: HTMLElement) => {
    setContent(content);
    setAnchorEl(el);
  };

  const hideTooltip = () => {
    setAnchorEl(null);
    setContent(null);
  };

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}
      <Popper open={Boolean(anchorEl)} anchorEl={anchorEl} placement="top">
        <Paper sx={{ padding: 1, maxWidth: 300 }}>
          {content}
        </Paper>
      </Popper>
    </TooltipContext.Provider>
  );
};

export const useTooltip = () => useContext(TooltipContext);
```

---

## Testing

### Unit Tests

```typescript
// src/__tests__/MyCustomChart.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyCustomChart } from '../MyCustomChart';

describe('MyCustomChart', () => {
  const mockData = [
    { category: 'A', value: 10 },
    { category: 'B', value: 20 },
    { category: 'C', value: 30 },
  ];

  it('renders without crashing', () => {
    const { container } = render(<MyCustomChart data={mockData} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders correct number of bars', () => {
    const { container } = render(<MyCustomChart data={mockData} />);
    const bars = container.querySelectorAll('.bar');
    expect(bars).toHaveLength(mockData.length);
  });

  it('calls onClick handler when bar is clicked', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <MyCustomChart data={mockData} onDataPointClick={handleClick} />
    );

    const firstBar = container.querySelector('.bar');
    if (firstBar) {
      fireEvent.click(firstBar);
      expect(handleClick).toHaveBeenCalledWith(mockData[0]);
    }
  });

  it('applies custom colors from config', () => {
    const customColors = ['#ff0000', '#00ff00', '#0000ff'];
    const { container } = render(
      <MyCustomChart data={mockData} config={{ colors: customColors }} />
    );

    const bars = container.querySelectorAll('.bar');
    expect(bars[0]).toHaveAttribute('fill', customColors[0]);
  });
});
```

### Integration Tests

```typescript
// src/__tests__/integration/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardCanvas } from '@summit/dashboard-builder';
import { MyCustomChartWidget } from '../index';

describe('Dashboard Integration', () => {
  it('renders custom chart widget in dashboard', async () => {
    const dashboard = {
      id: 'test-dashboard',
      name: 'Test Dashboard',
      widgets: [
        {
          id: 'widget-1',
          type: 'my-custom-chart',
          title: 'Test Chart',
          config: {
            dataSource: 'test-query',
          },
          layout: { i: 'widget-1', x: 0, y: 0, w: 6, h: 8 },
        },
      ],
      // ... other dashboard properties
    };

    render(<DashboardCanvas dashboard={dashboard} />);

    await waitFor(() => {
      expect(screen.getByText('Test Chart')).toBeInTheDocument();
    });
  });
});
```

---

## Publishing

### Build Your Package

```bash
# Build TypeScript
pnpm run build

# Run tests
pnpm run test

# Lint code
pnpm run lint
```

### Package Structure

```
my-custom-viz/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── MyCustomChart.tsx        # Component
│   ├── types.ts                 # Type definitions
│   ├── utils/                   # Utility functions
│   └── __tests__/               # Tests
├── dist/                        # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

### Publishing to Internal Registry

```bash
# Update version
pnpm version patch

# Publish to internal npm registry
pnpm publish --registry https://npm.summit.internal
```

---

## Examples

### Complete Custom Visualization Example

See the full example repository at:
`/examples/custom-visualizations/radial-tree/`

### Network Diagram Example

```typescript
// Advanced network visualization with custom layout
import { NetworkGraph } from '@summit/network-viz';

export const CustomNetworkWidget = () => {
  return (
    <NetworkGraph
      data={networkData}
      config={{
        layout: 'custom',
        customLayout: (nodes, edges) => {
          // Custom force simulation
          const simulation = d3
            .forceSimulation(nodes)
            .force('link', d3.forceLink(edges).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30));

          simulation.tick(100);

          return { nodes, edges };
        },
      }}
    />
  );
};
```

---

## Best Practices

1. **Performance**: Use memoization, virtualization, and efficient rendering
2. **Accessibility**: Include ARIA labels and keyboard navigation
3. **Responsiveness**: Support all screen sizes
4. **Type Safety**: Use TypeScript and Zod schemas
5. **Documentation**: Document props, configs, and usage
6. **Testing**: Maintain high test coverage
7. **Error Handling**: Graceful error states and fallbacks

---

## Resources

- D3.js Documentation: https://d3js.org
- React TypeScript Cheatsheet: https://react-typescript-cheatsheet.netlify.app
- Zod Documentation: https://zod.dev
- Summit Architecture Guide: `/docs/architecture/`

---

## Support

For questions and support:
- Create an issue on GitHub
- Join #visualization-dev on Slack
- Email: dev-support@summit.internal
