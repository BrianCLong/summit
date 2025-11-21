import { z } from 'zod';

export const NodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  type: z.string().optional(),
  group: z.string().optional(),
  size: z.number().optional(),
  color: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Node = z.infer<typeof NodeSchema>;

export const EdgeSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  type: z.string().optional(),
  weight: z.number().optional(),
  color: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Edge = z.infer<typeof EdgeSchema>;

export const GraphDataSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export type GraphData = z.infer<typeof GraphDataSchema>;

export const LayoutTypeSchema = z.enum([
  'force',
  'grid',
  'circle',
  'concentric',
  'breadthfirst',
  'cose',
  'cose-bilkent',
  'dagre',
  'cola',
  'fcose',
]);

export type LayoutType = z.infer<typeof LayoutTypeSchema>;

export const NetworkConfigSchema = z.object({
  layout: LayoutTypeSchema.default('force'),
  layoutOptions: z.record(z.unknown()).optional(),
  nodeSize: z.number().default(30),
  edgeWidth: z.number().default(2),
  showLabels: z.boolean().default(true),
  showEdgeLabels: z.boolean().default(false),
  zoomEnabled: z.boolean().default(true),
  panEnabled: z.boolean().default(true),
  nodeColorField: z.string().optional(),
  edgeColorField: z.string().optional(),
  animate: z.boolean().default(true),
  animationDuration: z.number().default(500),
});

export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;

export const NetworkStyleSchema = z.object({
  node: z.object({
    backgroundColor: z.string().default('#1976d2'),
    borderColor: z.string().default('#ffffff'),
    borderWidth: z.number().default(2),
    labelColor: z.string().default('#333333'),
    labelFontSize: z.number().default(12),
    shape: z.enum(['ellipse', 'rectangle', 'roundrectangle', 'diamond', 'pentagon', 'hexagon', 'star']).default('ellipse'),
  }).default({}),
  edge: z.object({
    lineColor: z.string().default('#999999'),
    lineStyle: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
    targetArrowShape: z.enum(['triangle', 'vee', 'circle', 'square', 'none']).default('triangle'),
    curveStyle: z.enum(['bezier', 'straight', 'haystack']).default('bezier'),
  }).default({}),
});

export type NetworkStyle = z.infer<typeof NetworkStyleSchema>;

export interface NetworkEventHandlers {
  onNodeClick?: (node: Node, event: cytoscape.EventObject) => void;
  onNodeDoubleClick?: (node: Node, event: cytoscape.EventObject) => void;
  onNodeHover?: (node: Node, event: cytoscape.EventObject) => void;
  onEdgeClick?: (edge: Edge, event: cytoscape.EventObject) => void;
  onBackgroundClick?: (event: cytoscape.EventObject) => void;
  onSelectionChange?: (selectedNodes: Node[], selectedEdges: Edge[]) => void;
  onLayoutComplete?: () => void;
}

export interface NetworkGraphRef {
  fit: () => void;
  center: () => void;
  zoom: (level: number) => void;
  pan: (x: number, y: number) => void;
  reset: () => void;
  selectNode: (nodeId: string) => void;
  selectNodes: (nodeIds: string[]) => void;
  clearSelection: () => void;
  highlight: (nodeIds: string[]) => void;
  exportPNG: () => Promise<string>;
  exportSVG: () => string;
  runLayout: (type?: LayoutType) => void;
}
