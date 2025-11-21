import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import type { GraphData, NetworkConfig, NetworkStyle, NetworkEventHandlers, NetworkGraphRef, Node, Edge } from '../types';

// Import layout extensions (these are registered globally)
// In a real implementation, ensure these are properly imported
// import cola from 'cytoscape-cola';
// import dagre from 'cytoscape-dagre';
// import fcose from 'cytoscape-fcose';

export interface NetworkGraphProps {
  data: GraphData;
  config?: Partial<NetworkConfig>;
  style?: Partial<NetworkStyle>;
  events?: NetworkEventHandlers;
  width?: number | string;
  height?: number | string;
  className?: string;
}

const defaultConfig: NetworkConfig = {
  layout: 'force',
  nodeSize: 30,
  edgeWidth: 2,
  showLabels: true,
  showEdgeLabels: false,
  zoomEnabled: true,
  panEnabled: true,
  animate: true,
  animationDuration: 500,
};

const defaultStyle: NetworkStyle = {
  node: {
    backgroundColor: '#1976d2',
    borderColor: '#ffffff',
    borderWidth: 2,
    labelColor: '#333333',
    labelFontSize: 12,
    shape: 'ellipse',
  },
  edge: {
    lineColor: '#999999',
    lineStyle: 'solid',
    targetArrowShape: 'triangle',
    curveStyle: 'bezier',
  },
};

// Map layout type to Cytoscape layout name
const LAYOUT_MAP: Record<string, string> = {
  force: 'cose',
  grid: 'grid',
  circle: 'circle',
  concentric: 'concentric',
  breadthfirst: 'breadthfirst',
  cose: 'cose',
  'cose-bilkent': 'cose-bilkent',
  dagre: 'dagre',
  cola: 'cola',
  fcose: 'fcose',
};

export const NetworkGraph = forwardRef<NetworkGraphRef, NetworkGraphProps>(
  ({ data, config = {}, style = {}, events = {}, width = '100%', height = 400, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);

    const mergedConfig = { ...defaultConfig, ...config };
    const mergedStyle = {
      node: { ...defaultStyle.node, ...style.node },
      edge: { ...defaultStyle.edge, ...style.edge },
    };

    // Initialize Cytoscape
    useEffect(() => {
      if (!containerRef.current) return;

      // Convert data to Cytoscape format
      const elements = [
        ...data.nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label || node.id,
            type: node.type,
            group: node.group,
            size: node.size || mergedConfig.nodeSize,
            color: node.color || mergedStyle.node.backgroundColor,
            ...node.metadata,
          },
          position: node.x !== undefined && node.y !== undefined
            ? { x: node.x, y: node.y }
            : undefined,
        })),
        ...data.edges.map((edge, index) => ({
          data: {
            id: edge.id || `edge-${index}`,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            type: edge.type,
            weight: edge.weight || 1,
            color: edge.color || mergedStyle.edge.lineColor,
            ...edge.metadata,
          },
        })),
      ];

      // Create Cytoscape instance
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': `data(color)`,
              'border-color': mergedStyle.node.borderColor,
              'border-width': mergedStyle.node.borderWidth,
              width: `data(size)`,
              height: `data(size)`,
              shape: mergedStyle.node.shape,
              label: mergedConfig.showLabels ? 'data(label)' : '',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': mergedStyle.node.labelFontSize,
              color: mergedStyle.node.labelColor,
              'text-outline-color': '#ffffff',
              'text-outline-width': 2,
            },
          },
          {
            selector: 'edge',
            style: {
              'line-color': `data(color)`,
              'target-arrow-color': `data(color)`,
              'target-arrow-shape': mergedStyle.edge.targetArrowShape,
              'curve-style': mergedStyle.edge.curveStyle,
              width: mergedConfig.edgeWidth,
              'line-style': mergedStyle.edge.lineStyle,
              label: mergedConfig.showEdgeLabels ? 'data(label)' : '',
              'font-size': 10,
              'text-rotation': 'autorotate',
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-color': '#ff5722',
              'border-width': 4,
            },
          },
          {
            selector: 'edge:selected',
            style: {
              'line-color': '#ff5722',
              width: mergedConfig.edgeWidth + 2,
            },
          },
          {
            selector: '.highlighted',
            style: {
              'background-color': '#ff5722',
              'line-color': '#ff5722',
            },
          },
          {
            selector: '.faded',
            style: {
              opacity: 0.25,
            },
          },
        ],
        layout: {
          name: LAYOUT_MAP[mergedConfig.layout] || 'cose',
          animate: mergedConfig.animate,
          animationDuration: mergedConfig.animationDuration,
          ...mergedConfig.layoutOptions,
        },
        userZoomingEnabled: mergedConfig.zoomEnabled,
        userPanningEnabled: mergedConfig.panEnabled,
        boxSelectionEnabled: true,
      });

      const cy = cyRef.current;

      // Set up event handlers
      if (events.onNodeClick) {
        cy.on('tap', 'node', (e) => {
          const nodeData = e.target.data();
          events.onNodeClick?.(nodeData as Node, e);
        });
      }

      if (events.onNodeDoubleClick) {
        cy.on('dbltap', 'node', (e) => {
          const nodeData = e.target.data();
          events.onNodeDoubleClick?.(nodeData as Node, e);
        });
      }

      if (events.onNodeHover) {
        cy.on('mouseover', 'node', (e) => {
          const nodeData = e.target.data();
          events.onNodeHover?.(nodeData as Node, e);
        });
      }

      if (events.onEdgeClick) {
        cy.on('tap', 'edge', (e) => {
          const edgeData = e.target.data();
          events.onEdgeClick?.(edgeData as Edge, e);
        });
      }

      if (events.onBackgroundClick) {
        cy.on('tap', (e) => {
          if (e.target === cy) {
            events.onBackgroundClick?.(e);
          }
        });
      }

      if (events.onSelectionChange) {
        cy.on('select unselect', () => {
          const selectedNodes = cy.nodes(':selected').map(n => n.data() as Node);
          const selectedEdges = cy.edges(':selected').map(e => e.data() as Edge);
          events.onSelectionChange?.(selectedNodes, selectedEdges);
        });
      }

      if (events.onLayoutComplete) {
        cy.on('layoutstop', events.onLayoutComplete);
      }

      return () => {
        cy.destroy();
      };
    }, [data, mergedConfig, mergedStyle, events]);

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      fit: () => cyRef.current?.fit(),
      center: () => cyRef.current?.center(),
      zoom: (level: number) => cyRef.current?.zoom(level),
      pan: (x: number, y: number) => cyRef.current?.pan({ x, y }),
      reset: () => {
        cyRef.current?.fit();
        cyRef.current?.center();
      },
      selectNode: (nodeId: string) => {
        cyRef.current?.nodes().unselect();
        cyRef.current?.$(`#${nodeId}`).select();
      },
      selectNodes: (nodeIds: string[]) => {
        cyRef.current?.nodes().unselect();
        nodeIds.forEach(id => cyRef.current?.$(`#${id}`).select());
      },
      clearSelection: () => {
        cyRef.current?.elements().unselect();
      },
      highlight: (nodeIds: string[]) => {
        cyRef.current?.elements().removeClass('highlighted faded');
        if (nodeIds.length > 0) {
          const selected = cyRef.current?.nodes().filter(n => nodeIds.includes(n.id()));
          selected?.addClass('highlighted');
          cyRef.current?.elements().not(selected!).addClass('faded');
        }
      },
      exportPNG: async () => {
        return cyRef.current?.png({ full: true, scale: 2 }) || '';
      },
      exportSVG: () => {
        return cyRef.current?.svg({ full: true }) || '';
      },
      runLayout: (type?: string) => {
        const layoutName = type ? (LAYOUT_MAP[type] || type) : LAYOUT_MAP[mergedConfig.layout];
        cyRef.current?.layout({ name: layoutName, animate: true }).run();
      },
    }), [mergedConfig.layout]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width,
          height: typeof height === 'number' ? `${height}px` : height,
        }}
      />
    );
  }
);

NetworkGraph.displayName = 'NetworkGraph';

export default NetworkGraph;
