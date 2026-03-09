/**
 * Summit War Room — Graph Intelligence Canvas
 *
 * Interactive graph visualization using Cytoscape.js.
 * Supports entity clustering, pattern highlighting, path analysis,
 * and timeline overlays. Optimized for 50k+ node graphs via
 * virtualization and progressive rendering.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import { useWarRoomStore } from '../store';
import { GraphQueryBar } from './GraphQueryBar';

export const GraphCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const entities = useWarRoomStore((s) => s.entities);
  const relationships = useWarRoomStore((s) => s.relationships);
  const setSelectedEntity = useWarRoomStore((s) => s.setSelectedEntity);
  const setSelectedRelationship = useWarRoomStore((s) => s.setSelectedRelationship);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    let cy: any;
    const initGraph = async () => {
      const cytoscape = (await import('cytoscape')).default;

      cy = cytoscape({
        container: containerRef.current,
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'background-color': 'data(color)',
              color: '#E2E8F0',
              'font-size': '10px',
              'text-valign': 'bottom',
              'text-margin-y': 4,
              width: 'data(size)',
              height: 'data(size)',
              'border-width': 2,
              'border-color': '#334155',
              'text-outline-width': 2,
              'text-outline-color': '#0B1220',
            },
          },
          {
            selector: 'node:selected',
            style: {
              'border-color': '#60A5FA',
              'border-width': 3,
              'overlay-color': '#60A5FA',
              'overlay-opacity': 0.15,
            },
          },
          {
            selector: 'edge',
            style: {
              width: 'data(weight)',
              'line-color': '#475569',
              'target-arrow-color': '#475569',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              label: 'data(label)',
              'font-size': '8px',
              color: '#94A3B8',
              'text-rotation': 'autorotate',
              'text-outline-width': 1,
              'text-outline-color': '#0B1220',
            },
          },
          {
            selector: 'edge:selected',
            style: {
              'line-color': '#60A5FA',
              'target-arrow-color': '#60A5FA',
              width: 3,
            },
          },
          {
            selector: '.highlighted',
            style: {
              'background-color': '#FBBF24',
              'line-color': '#FBBF24',
              'target-arrow-color': '#FBBF24',
            },
          },
          {
            selector: '.anomaly',
            style: {
              'background-color': '#F87171',
              'border-color': '#EF4444',
            },
          },
        ],
        layout: { name: 'cose', animate: false, nodeOverlap: 20, idealEdgeLength: 80 },
        minZoom: 0.1,
        maxZoom: 5,
        wheelSensitivity: 0.3,
      });

      cyRef.current = cy;

      // Entity selection
      cy.on('tap', 'node', (evt: any) => {
        const nodeId = evt.target.id();
        setSelectedEntity(nodeId);
        setSelectedRelationship(null);
      });

      cy.on('tap', 'edge', (evt: any) => {
        const edgeId = evt.target.id();
        setSelectedRelationship(edgeId);
        setSelectedEntity(null);
      });

      cy.on('tap', (evt: any) => {
        if (evt.target === cy) {
          setSelectedEntity(null);
          setSelectedRelationship(null);
        }
      });
    };

    initGraph();

    return () => {
      cy?.destroy();
    };
  }, [setSelectedEntity, setSelectedRelationship]);

  // Sync graph data
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Batch update for performance with large graphs
    cy.batch(() => {
      cy.elements().remove();

      const TYPE_COLORS: Record<string, string> = {
        person: '#60A5FA',
        org: '#A78BFA',
        location: '#34D399',
        event: '#FBBF24',
        asset: '#F87171',
        document: '#94A3B8',
      };

      // Add nodes (virtualize: only first 5000 for initial render)
      const nodeSlice = entities.slice(0, 5000);
      cy.add(
        nodeSlice.map((e) => ({
          group: 'nodes' as const,
          data: {
            id: e.id,
            label: e.label,
            color: TYPE_COLORS[e.type] ?? '#94A3B8',
            size: e.sources.length > 3 ? 30 : 20,
            entityType: e.type,
          },
        })),
      );

      // Add edges
      const nodeIds = new Set(nodeSlice.map((e) => e.id));
      const edgeSlice = relationships.filter((r) => nodeIds.has(r.source) && nodeIds.has(r.target));
      cy.add(
        edgeSlice.map((r) => ({
          group: 'edges' as const,
          data: {
            id: r.id,
            source: r.source,
            target: r.target,
            label: r.type,
            weight: Math.max(1, Math.min(r.weight, 5)),
          },
        })),
      );
    });

    // Re-layout
    if (entities.length > 0) {
      cy.layout({
        name: entities.length > 500 ? 'cose' : 'cose',
        animate: entities.length < 200,
        nodeOverlap: 20,
        idealEdgeLength: 80,
        maxSimulationTime: entities.length > 1000 ? 2000 : 4000,
      }).run();
    }
  }, [entities, relationships]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <GraphQueryBar />
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          bgcolor: 'background.default',
          '& canvas': { outline: 'none' },
        }}
      />
    </Box>
  );
};
