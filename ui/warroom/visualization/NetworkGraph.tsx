/**
 * Summit War Room — Network Graph Visualization
 *
 * Force-directed network graph using D3 for advanced
 * network analysis and pattern detection.
 */

import React, { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useWarRoomStore } from '../store';

export const NetworkGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const entities = useWarRoomStore((s) => s.entities);
  const relationships = useWarRoomStore((s) => s.relationships);

  useEffect(() => {
    if (!svgRef.current || entities.length === 0) return;

    const initD3Graph = async () => {
      const d3 = await import('d3');
      const svg = d3.select(svgRef.current);
      const width = svgRef.current!.clientWidth;
      const height = svgRef.current!.clientHeight;

      svg.selectAll('*').remove();

      const g = svg.append('g');

      // Zoom
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 5])
        .on('zoom', (event) => g.attr('transform', event.transform));
      svg.call(zoom);

      // Data
      const nodes = entities.slice(0, 2000).map((e) => ({ id: e.id, label: e.label, type: e.type }));
      const nodeIds = new Set(nodes.map((n) => n.id));
      const links = relationships
        .filter((r) => nodeIds.has(r.source) && nodeIds.has(r.target))
        .map((r) => ({ source: r.source, target: r.target, type: r.type }));

      const TYPE_COLORS: Record<string, string> = {
        person: '#60A5FA', org: '#A78BFA', location: '#34D399',
        event: '#FBBF24', asset: '#F87171', document: '#94A3B8',
      };

      // Simulation
      const simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(60))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide(15));

      // Links
      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#475569')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.6);

      // Nodes
      const node = g.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', 6)
        .attr('fill', (d: any) => TYPE_COLORS[d.type] ?? '#94A3B8')
        .attr('stroke', '#1E293B')
        .attr('stroke-width', 1);

      // Labels
      const labels = g.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .text((d: any) => d.label)
        .attr('font-size', 9)
        .attr('fill', '#94A3B8')
        .attr('dx', 10)
        .attr('dy', 3);

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);
        node
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y);
        labels
          .attr('x', (d: any) => d.x)
          .attr('y', (d: any) => d.y);
      });
    };

    initD3Graph();
  }, [entities, relationships]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 1.5, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" fontWeight={600}>
          Network Graph — {entities.length} nodes, {relationships.length} edges
        </Typography>
      </Box>
      <Box sx={{ flex: 1, bgcolor: 'background.default' }}>
        <svg ref={svgRef} width="100%" height="100%" />
      </Box>
    </Box>
  );
};
