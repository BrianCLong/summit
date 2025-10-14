import React, { useEffect, useRef } from 'react';

export default function TTPCorrelationOverlay({ cy, nodes, edges, open }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!cy || !canvasRef.current || !open) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const drawOverlay = () => {
      const rect = cy.container().getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Only draw if the overlay is open
      if (!open) return;

      // Example: Highlight nodes with ATT&CK TTPs
      nodes.forEach(node => {
        if (node.attack_ttps && node.attack_ttps.length > 0) {
          const cyNode = cy.getElementById(node.id);
          if (cyNode && cyNode.isNode() && cyNode.visible()) {
            const pos = cyNode.renderedPosition();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Red overlay for ATT&CK
            ctx.fill();
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      });

      // Example: Highlight edges with CAPEC TTPs
      edges.forEach(edge => {
        if (edge.capec_ttps && edge.capec_ttps.length > 0) {
          const cyEdge = cy.getElementById(edge.id);
          if (cyEdge && cyEdge.isEdge() && cyEdge.visible()) {
            // For edges, drawing a simple line or rectangle might be more complex
            // For now, let's just change the edge color in Cytoscape directly if possible,
            // or draw a simple indicator near the edge.
            const sourceNode = cy.getElementById(edge.fromEntityId);
            if (sourceNode && sourceNode.isNode() && sourceNode.visible()) {
              const pos = sourceNode.renderedPosition();
              ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'; // Blue overlay for CAPEC
              ctx.fillRect(pos.x - 10, pos.y - 10, 20, 20);
            }
          }
        }
      });
    };

    cy.on('render zoom pan', drawOverlay);
    drawOverlay(); // Initial draw

    return () => {
      cy.off('render zoom pan', drawOverlay);
    };
  }, [cy, nodes, edges, open]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Allow interaction with graph underneath
        zIndex: 5, // Ensure it's above the graph but below UI controls
      }}
    />
  );
}