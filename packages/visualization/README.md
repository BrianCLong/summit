# GraphCanvas Component Documentation

## Overview
The GraphCanvas component is a comprehensive graph visualization tool for the Summit/IntelGraph platform. It provides an interactive canvas for visualizing nodes and edges with support for zoom/pan functionality, node/edge rendering, selection/highlighting, and filtering.

## Features

### Core Functionality
- **Zoom/Pan**: Interactive zooming and panning capabilities
- **Node/Edge Rendering**: Visual representation of nodes and connections
- **Selection/Highlighting**: Click to select nodes and highlight connected elements
- **Filtering**: Filter nodes based on custom criteria
- **Tooltips**: Hover tooltips with node information
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Keyboard navigation and ARIA attributes

### Advanced Features
- **Layout Options**: Force-directed, hierarchical, circular, and grid layouts
- **Dynamic Styling**: Customizable node size, color, and link properties
- **Interaction Controls**: Configurable interaction modes
- **Performance Optimization**: Efficient rendering for large graphs

## Usage

### Basic Example
```tsx
import { GraphCanvas, GraphNode, GraphLink } from '@intelgraph/visualization';

const nodes: GraphNode[] = [
  { id: '1', label: 'Node 1', type: 'person' },
  { id: '2', label: 'Node 2', type: 'organization' },
];

const links: GraphLink[] = [
  { id: '1', source: '1', target: '2', type: 'connection' }
];

function MyComponent() {
  return (
    <GraphCanvas
      nodes={nodes}
      links={links}
      nodeColor={(node) => node.type === 'person' ? '#3b82f6' : '#ef4444'}
      onNodeClick={(node) => console.log('Node clicked:', node)}
      enableSelection={true}
      enableHighlighting={true}
      showLabels={true}
    />
  );
}
```

### Advanced Example
```tsx
import { GraphCanvas, GraphNode, GraphLink } from '@intelgraph/visualization';

function AdvancedGraphExample() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const filteredNodes = nodes.filter(node => 
    !selectedType || node.type === selectedType
  );
  
  const getNodeColor = (node: GraphNode): string => {
    const colorMap: Record<string, string> = {
      person: '#3b82f6',
      organization: '#10b981',
      location: '#8b5cf6',
      // ... more mappings
    };
    return colorMap[node.type] || '#6b7280';
  };

  return (
    <div>
      <select onChange={(e) => setSelectedType(e.target.value || null)}>
        <option value="">All Types</option>
        <option value="person">Person</option>
        <option value="organization">Organization</option>
      </select>
      
      <GraphCanvas
        nodes={filteredNodes}
        links={links}
        nodeColor={getNodeColor}
        linkColor={(link) => link.type === 'strong' ? '#ef4444' : '#999'}
        linkOpacity={(link) => link.strength || 0.6}
        onNodeClick={(node) => console.log('Node clicked:', node)}
        tooltipContent={(node) => `${node.label} (${node.type})`}
        showLabels={true}
        enableSelection={true}
        enableHighlighting={true}
        highlightConnected={true}
        enableTooltips={true}
        enableZoom={true}
        enablePan={true}
        enableDrag={true}
        layout="force"
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `GraphNode[]` | Required | Array of nodes to visualize |
| `links` | `GraphLink[]` | Required | Array of links connecting nodes |
| `width` | `number` | Auto | Width of the canvas |
| `height` | `number` | Auto | Height of the canvas |
| `className` | `string` | `''` | Additional CSS class names |
| `margin` | `Margin` | `{top: 20, right: 20, bottom: 40, left: 40}` | Canvas margins |
| `nodeSize` | `number \| (node: GraphNode) => number` | `10` | Size of nodes |
| `nodeColor` | `string \| (node: GraphNode) => string` | `'#1f77b4'` | Color of nodes |
| `linkColor` | `string \| (link: GraphLink) => string` | `'#999'` | Color of links |
| `linkWidth` | `number \| (link: GraphLink) => number` | `1` | Width of links |
| `linkOpacity` | `number \| (link: GraphLink) => number` | `0.6` | Opacity of links |
| `onNodeClick` | `(node: GraphNode) => void` | - | Callback when a node is clicked |
| `onNodeHover` | `(node: GraphNode \| null) => void` | - | Callback when a node is hovered |
| `onLinkClick` | `(link: GraphLink) => void` | - | Callback when a link is clicked |
| `onLinkHover` | `(link: GraphLink \| null) => void` | - | Callback when a link is hovered |
| `interaction` | `InteractionConfig` | `{enabled: true, zoom: true, ...}` | Interaction configuration |
| `layout` | `'force' \| 'hierarchical' \| 'circular' \| 'grid'` | `'force'` | Graph layout algorithm |
| `layoutConfig` | `any` | `{}` | Layout-specific configuration |
| `showLabels` | `boolean` | `true` | Whether to show node labels |
| `labelThreshold` | `number` | `1.5` | Minimum zoom level to show labels |
| `enableFiltering` | `boolean` | `false` | Enable node filtering |
| `filterFn` | `(node: GraphNode) => boolean` | - | Function to filter nodes |
| `enableHighlighting` | `boolean` | `true` | Enable highlighting of connected elements |
| `highlightConnected` | `boolean` | `true` | Highlight connected nodes/links on hover |
| `enableTooltips` | `boolean` | `true` | Enable tooltips on hover |
| `tooltipContent` | `(node: GraphNode) => string` | - | Custom tooltip content function |
| `enableZoom` | `boolean` | `true` | Enable zoom functionality |
| `enablePan` | `boolean` | `true` | Enable pan functionality |
| `enableDrag` | `boolean` | `true` | Enable node dragging |
| `enableSelection` | `boolean` | `true` | Enable node selection |
| `enableAnimation` | `boolean` | `true` | Enable animations |
| `animationDuration` | `number` | `750` | Animation duration in ms |
| `onGraphReady` | `() => void` | - | Callback when graph is ready for interaction |

## Types

### GraphNode
```ts
interface GraphNode extends SimulationNodeDatum {
  id: string;
  type?: string;
  label?: string;
  size?: number;
  color?: string;
  data?: any;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}
```

### GraphLink
```ts
interface GraphLink extends SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
  strength?: number;
  data?: any;
}
```

## Styling

The component supports theming through the IntelGraph design system via the `useVisualizationTheme` hook. You can customize colors, fonts, and other visual properties through the theme context.

## Performance

The GraphCanvas component is optimized for performance with large datasets:
- Uses D3.js for efficient rendering
- Implements virtualization techniques
- Optimized force simulation algorithms
- Efficient event handling

For very large graphs (>500 nodes), consider implementing canvas-based rendering or clustering strategies.

## Accessibility

The component follows accessibility best practices:
- Keyboard navigation support
- ARIA attributes for screen readers
- Sufficient color contrast
- Focus management
- Semantic HTML structure

## Integration with IntelGraph Platform

The GraphCanvas component integrates seamlessly with the IntelGraph platform:
- Uses the platform's design system
- Compatible with IntelGraph data models
- Integrates with existing visualization contexts
- Follows IntelGraph's accessibility standards