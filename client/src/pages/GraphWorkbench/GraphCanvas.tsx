import React, { useEffect, useRef, useState } from 'react';
import $ from 'jquery';
import cytoscape from 'cytoscape';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
// import { useGwGraphDataQuery, useGwSearchEntitiesLazyQuery } from '../../generated/graphql';

export default function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTarget, setMenuTarget] = useState<{ id?: string } | null>(null);

  // Mock data until GraphQL queries are available
  const data = { graphData: { nodes: [], edges: [] } };
  const loading = false;
  const error = null;

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert GraphQL data to Cytoscape elements
    let elements: any[] = [];
    if (data?.graphData) {
      const nodes = data.graphData.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          description: node.description,
        },
      }));

      const edges = data.graphData.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.fromEntityId,
          target: edge.toEntityId,
          label: edge.label,
          type: edge.type,
        },
      }));

      elements = [...nodes, ...edges];
    }

    // Fallback elements if no data
    if (elements.length === 0) {
      elements = [
        { data: { id: 'a', label: 'Entity A' } },
        { data: { id: 'b', label: 'Entity B' } },
        { data: { id: 'c', label: 'Entity C' } },
        { data: { source: 'a', target: 'b' } },
        { data: { source: 'a', target: 'c' } },
      ];
    }

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#1976d2',
            label: 'data(label)',
            color: '#fff',
            'font-size': 10,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#90caf9',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#90caf9',
            'curve-style': 'bezier',
          },
        },
      ],
      layout: { name: 'cose' },
      elements,
    });
    cyRef.current = cy;

    // jQuery: context menu binding
    const $container = $('#graph-root');
    const onContext = (e: JQuery.ContextMenuEvent) => {
      e.preventDefault();
      const node = cy
        .$('node')
        .find(
          (n: any) =>
            n.renderedBoundingBox().x1 < e.offsetX &&
            n.renderedBoundingBox().x2 > e.offsetX &&
            n.renderedBoundingBox().y1 < e.offsetY &&
            n.renderedBoundingBox().y2 > e.offsetY,
        );
      setMenuTarget(node ? { id: node.id() } : null);
      setMenuAnchor(e.currentTarget as HTMLElement);
    };
    $container.on('contextmenu', onContext);

    // jQuery: simple lasso (marquee)
    let lasso = false;
    let startX = 0;
    let startY = 0;
    let $marquee: JQuery | null = null;
    $container.on('mousedown', (e: any) => {
      if (e.button !== 0 || e.shiftKey !== true) return; // hold Shift to lasso
      lasso = true;
      startX = e.pageX;
      startY = e.pageY;
      $marquee = $('<div/>')
        .css({
          position: 'absolute',
          border: '1px dashed #1976d2',
          background: 'rgba(25,118,210,0.1)',
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          zIndex: 10,
        })
        .appendTo('body');
    });
    $container.on('mousemove', (e: any) => {
      if (!lasso || !$marquee) return;
      const x = Math.min(e.pageX, startX);
      const y = Math.min(e.pageY, startY);
      const w = Math.abs(e.pageX - startX);
      const h = Math.abs(e.pageY - startY);
      $marquee.css({ left: x, top: y, width: w, height: h });
    });
    $container.on('mouseup', (e: any) => {
      if (!lasso) return;
      lasso = false;
      if ($marquee) {
        $marquee.remove();
        $marquee = null;
      }
      const rect = {
        x1: Math.min(e.pageX, startX),
        y1: Math.min(e.pageY, startY),
        x2: Math.max(e.pageX, startX),
        y2: Math.max(e.pageY, startY),
      };
      cy.elements('node').unselect();
      cy.nodes().forEach((n) => {
        const bb = n.renderedBoundingBox();
        const cx = (bb.x1 + bb.x2) / 2;
        const cyy = (bb.y1 + bb.y2) / 2;
        if (cx >= rect.x1 && cx <= rect.x2 && cyy >= rect.y1 && cyy <= rect.y2)
          n.select();
      });
    });

    return () => {
      $container.off('contextmenu', onContext);
      $container.off('mousedown');
      $container.off('mousemove');
      $container.off('mouseup');
      cy.destroy();
    };
  }, [data]);

  const handleExpandNeighbors = () => {
    const cy = cyRef.current;
    if (!cy || !menuTarget?.id) return;
    const id = menuTarget.id;
    const newId = `${id}-${Math.floor(Math.random() * 1000)}`;
    cy.add([
      { data: { id: newId, label: `N:${newId}` } },
      { data: { source: id, target: newId } },
    ]);
    cy.layout({ name: 'cose', animate: false }).run();
    setMenuAnchor(null);
  };

  const handlePinToggle = () => {
    const cy = cyRef.current;
    if (!cy || !menuTarget?.id) return;
    const node = cy.$id(menuTarget.id);
    node.grabbed() ? node.ungrabify() : node.grabify();
    setMenuAnchor(null);
  };

  if (loading) {
    return (
      <Box
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: 2,
          height: 600,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Box
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: 2,
          height: 600,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="error">
          Error loading graph data: {error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        height: 600,
        position: 'relative',
      }}
    >
      <div
        id="graph-root"
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleExpandNeighbors}>Expand Neighbors</MenuItem>
        <MenuItem onClick={handlePinToggle}>Pin/Unpin</MenuItem>
        <MenuItem
          onClick={() => {
            alert(`Open details: ${menuTarget?.id}`);
            setMenuAnchor(null);
          }}
        >
          Open Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            alert('Added to investigation');
            setMenuAnchor(null);
          }}
        >
          Add to Investigation
        </MenuItem>
      </Menu>
      <Box
        sx={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          display: 'flex',
          gap: 1,
        }}
      >
        <Button
          size="small"
          variant="outlined"
          onClick={() => cyRef.current?.fit()}
        >
          Fit
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            cyRef.current?.layout({ name: 'cose', animate: false }).run()
          }
        >
          Layout
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const url = (cyRef.current as any)?.png();
            const a = document.createElement('a');
            a.href = url;
            a.download = 'graph.png';
            a.click();
          }}
        >
          Export PNG
        </Button>
      </Box>
    </Box>
  );
}
