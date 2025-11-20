/**
 * Lineage Graph Visualization Component
 * Interactive D3-based data lineage visualization
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import dagre from 'dagre';
import { LineageGraph as LineageGraphType, LineageNode, LineageEdge } from '@intelgraph/data-catalog';

export interface LineageGraphProps {
  lineageData: LineageGraphType;
  onNodeClick?: (node: LineageNode) => void;
  onEdgeClick?: (edge: LineageEdge) => void;
  width?: number;
  height?: number;
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
}

export const LineageGraph: React.FC<LineageGraphProps> = ({
  lineageData,
  onNodeClick,
  onEdgeClick,
  width = 1200,
  height = 800,
  direction = 'LR',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform | null>(null);

  useEffect(() => {
    if (!svgRef.current || !lineageData) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Create container group for zoom/pan
    const container = svg.append('g').attr('class', 'container');

    // Set up zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setZoomTransform(event.transform);
      });

    svg.call(zoom);

    // Create dagre graph for layout
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to graph
    lineageData.nodes.forEach((node) => {
      g.setNode(node.id, {
        label: node.name,
        width: 180,
        height: 60,
        ...node,
      });
    });

    // Add edges to graph
    lineageData.edges.forEach((edge) => {
      g.setEdge(edge.fromNodeId, edge.toNodeId, edge);
    });

    // Calculate layout
    dagre.layout(g);

    // Draw edges
    const edges = container
      .selectAll('.edge')
      .data(lineageData.edges)
      .join('g')
      .attr('class', 'edge')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onEdgeClick?.(d);
      });

    edges
      .append('path')
      .attr('d', (d) => {
        const sourceNode = g.node(d.fromNodeId);
        const targetNode = g.node(d.toNodeId);

        if (!sourceNode || !targetNode) return '';

        const points = [
          { x: sourceNode.x, y: sourceNode.y },
          { x: (sourceNode.x + targetNode.x) / 2, y: sourceNode.y },
          { x: (sourceNode.x + targetNode.x) / 2, y: targetNode.y },
          { x: targetNode.x, y: targetNode.y },
        ];

        return d3.line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .curve(d3.curveBasis)(points) || '';
      })
      .attr('fill', 'none')
      .attr('stroke', '#888')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Add arrow marker definition
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#888');

    // Draw nodes
    const nodes = container
      .selectAll('.node')
      .data(lineageData.nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => {
        const node = g.node(d.id);
        return `translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.id);
        onNodeClick?.(d);
      });

    // Node background
    nodes
      .append('rect')
      .attr('width', (d) => g.node(d.id).width)
      .attr('height', (d) => g.node(d.id).height)
      .attr('rx', 8)
      .attr('fill', (d) => {
        if (d.id === selectedNode) return '#4A90E2';
        if (d.assetId === lineageData.rootAssetId) return '#50C878';
        return '#f0f0f0';
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 2);

    // Node label
    nodes
      .append('text')
      .attr('x', (d) => g.node(d.id).width / 2)
      .attr('y', (d) => g.node(d.id).height / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d) => (d.id === selectedNode || d.assetId === lineageData.rootAssetId ? '#fff' : '#333'))
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text((d) => {
        const maxLength = 20;
        return d.name.length > maxLength ? d.name.substring(0, maxLength) + '...' : d.name;
      });

    // Node type label
    nodes
      .append('text')
      .attr('x', (d) => g.node(d.id).width / 2)
      .attr('y', (d) => g.node(d.id).height / 2 + 16)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d) => (d.id === selectedNode || d.assetId === lineageData.rootAssetId ? '#fff' : '#666'))
      .style('font-size', '10px')
      .text((d) => d.type);

    // Center the graph
    const graphBounds = g.graph();
    const initialTransform = d3.zoomIdentity
      .translate(width / 2 - graphBounds.width! / 2, height / 2 - graphBounds.height! / 2)
      .scale(0.8);

    svg.call(zoom.transform, initialTransform);

  }, [lineageData, direction, width, height, selectedNode, onNodeClick, onEdgeClick]);

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} style={{ border: '1px solid #ddd', borderRadius: '8px' }} />

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          fontSize: '12px',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '20px', background: '#50C878', marginRight: '8px', borderRadius: '4px' }} />
          <span>Root Asset</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '20px', background: '#4A90E2', marginRight: '8px', borderRadius: '4px' }} />
          <span>Selected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '20px', height: '20px', background: '#f0f0f0', border: '2px solid #333', marginRight: '8px', borderRadius: '4px' }} />
          <span>Other Assets</span>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'white',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={() => {
            if (svgRef.current) {
              const svg = d3.select(svgRef.current);
              const zoom = d3.zoom<SVGSVGElement, unknown>();
              svg.transition().call(zoom.scaleBy, 1.2);
            }
          }}
          style={{ padding: '4px 8px', cursor: 'pointer' }}
        >
          +
        </button>
        <button
          onClick={() => {
            if (svgRef.current) {
              const svg = d3.select(svgRef.current);
              const zoom = d3.zoom<SVGSVGElement, unknown>();
              svg.transition().call(zoom.scaleBy, 0.8);
            }
          }}
          style={{ padding: '4px 8px', cursor: 'pointer' }}
        >
          −
        </button>
        <button
          onClick={() => {
            if (svgRef.current) {
              const svg = d3.select(svgRef.current);
              const zoom = d3.zoom<SVGSVGElement, unknown>();
              const initialTransform = d3.zoomIdentity.scale(0.8);
              svg.transition().call(zoom.transform, initialTransform);
            }
          }}
          style={{ padding: '4px 8px', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default LineageGraph;
