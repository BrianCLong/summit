/**
 * Cytoscape Stylesheet
 * Styling configuration for the graph visualization
 */

import { NODE_TYPE_COLORS } from './types';

export function getCytoscapeStylesheet() {
  return [
    // Base node style
    {
      selector: 'node',
      style: {
        'background-color': NODE_TYPE_COLORS.DEFAULT,
        'border-width': 2,
        'border-color': '#fff',
        label: 'data(label)',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 8,
        'font-size': 12,
        'font-weight': 500,
        'font-family': 'Inter, system-ui, sans-serif',
        color: '#374151',
        'text-outline-color': '#fff',
        'text-outline-width': 2,
        'text-max-width': 100,
        'text-wrap': 'ellipsis',
        width: 40,
        height: 40,
        'transition-property': 'background-color, border-color, width, height',
        'transition-duration': '0.2s',
        'transition-timing-function': 'ease-out',
      },
    },

    // Node type-specific colors
    {
      selector: 'node.person',
      style: {
        'background-color': NODE_TYPE_COLORS.PERSON,
      },
    },
    {
      selector: 'node.organization',
      style: {
        'background-color': NODE_TYPE_COLORS.ORGANIZATION,
      },
    },
    {
      selector: 'node.location',
      style: {
        'background-color': NODE_TYPE_COLORS.LOCATION,
      },
    },
    {
      selector: 'node.document',
      style: {
        'background-color': NODE_TYPE_COLORS.DOCUMENT,
      },
    },
    {
      selector: 'node.event',
      style: {
        'background-color': NODE_TYPE_COLORS.EVENT,
      },
    },
    {
      selector: 'node.asset',
      style: {
        'background-color': NODE_TYPE_COLORS.ASSET,
      },
    },
    {
      selector: 'node.threat',
      style: {
        'background-color': NODE_TYPE_COLORS.THREAT,
      },
    },
    {
      selector: 'node.indicator',
      style: {
        'background-color': NODE_TYPE_COLORS.INDICATOR,
      },
    },

    // Selected node
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#3b82f6',
        width: 50,
        height: 50,
        'z-index': 10,
      },
    },

    // Hover state
    {
      selector: 'node.hover',
      style: {
        'border-width': 3,
        'border-color': '#60a5fa',
        width: 45,
        height: 45,
        'z-index': 5,
      },
    },

    // Highlighted nodes (e.g., search results, traversal path)
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 4,
        'border-color': '#fbbf24',
        'background-opacity': 1,
      },
    },

    // Faded nodes (for focusing on specific subgraph)
    {
      selector: 'node.faded',
      style: {
        opacity: 0.3,
      },
    },

    // Base edge style
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': 10,
        'font-family': 'Inter, system-ui, sans-serif',
        color: '#64748b',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'text-background-color': '#fff',
        'text-background-opacity': 0.8,
        'text-background-padding': 2,
        'transition-property': 'line-color, width, opacity',
        'transition-duration': '0.2s',
        'transition-timing-function': 'ease-out',
      },
    },

    // Selected edge
    {
      selector: 'edge:selected',
      style: {
        width: 4,
        'line-color': '#3b82f6',
        'target-arrow-color': '#3b82f6',
        'z-index': 10,
      },
    },

    // Hover edge
    {
      selector: 'edge.hover',
      style: {
        width: 3,
        'line-color': '#60a5fa',
        'target-arrow-color': '#60a5fa',
      },
    },

    // Highlighted edges
    {
      selector: 'edge.highlighted',
      style: {
        width: 3,
        'line-color': '#fbbf24',
        'target-arrow-color': '#fbbf24',
      },
    },

    // Faded edges
    {
      selector: 'edge.faded',
      style: {
        opacity: 0.2,
      },
    },

    // Predicted edges (dashed)
    {
      selector: 'edge.predicted',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
        'line-color': '#a855f7',
        'target-arrow-color': '#a855f7',
      },
    },

    // High confidence edges
    {
      selector: 'edge[confidence >= 0.8]',
      style: {
        width: 3,
      },
    },

    // Low confidence edges
    {
      selector: 'edge[confidence < 0.5]',
      style: {
        width: 1,
        'line-style': 'dotted',
        opacity: 0.7,
      },
    },

    // Edge handle extension styles
    {
      selector: '.eh-handle',
      style: {
        'background-color': '#3b82f6',
        width: 12,
        height: 12,
        shape: 'ellipse',
        'overlay-opacity': 0,
        'border-width': 2,
        'border-color': '#fff',
      },
    },
    {
      selector: '.eh-hover',
      style: {
        'background-color': '#60a5fa',
      },
    },
    {
      selector: '.eh-source',
      style: {
        'border-color': '#3b82f6',
        'border-width': 3,
      },
    },
    {
      selector: '.eh-target',
      style: {
        'border-color': '#22c55e',
        'border-width': 3,
      },
    },
    {
      selector: '.eh-preview, .eh-ghost-edge',
      style: {
        'background-color': '#3b82f6',
        'line-color': '#3b82f6',
        'target-arrow-color': '#3b82f6',
        'source-arrow-color': '#3b82f6',
        'line-style': 'dashed',
        'line-dash-pattern': [4, 2],
      },
    },
  ];
}

// Dark mode stylesheet overrides
export function getDarkModeStylesheet() {
  return [
    {
      selector: 'node',
      style: {
        'border-color': '#1e293b',
        color: '#e2e8f0',
        'text-outline-color': '#1e293b',
      },
    },
    {
      selector: 'edge',
      style: {
        'line-color': '#475569',
        'target-arrow-color': '#475569',
        color: '#94a3b8',
        'text-background-color': '#1e293b',
      },
    },
  ];
}
