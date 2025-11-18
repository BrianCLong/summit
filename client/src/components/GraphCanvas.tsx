 
import React, { useEffect, useRef } from 'react';
import cytoscape, { ElementDefinition } from 'cytoscape';
import $ from 'jquery';
import { useDispatch, useSelector } from 'react-redux';
import { addNode, addEdge } from '../store/graphSlice';
import { RootState } from '../store/types';
import { io, Socket } from 'socket.io-client';

/**
 * GraphCanvas mounts a Cytoscape instance and wires up
 * jQuery interactions plus live updates via Socket.IO.
 * It manages basic drag events and listens for backend
 * node/edge additions, dispatching them into Redux.
 */
const GraphCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  const graph = useSelector((s: RootState) => s.graphData);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...graph.nodes, ...graph.edges] as ElementDefinition[],
      style: [{ selector: 'node', style: { label: 'data(id)' } }],
      layout: { name: 'grid' },
    });

    // jQuery wrapper for simple drag feedback
    $(cy.container()).on('mouseup', 'node', (evt: any) => {
      const n = evt.target;
      dispatch(
        addNode({
          data: { id: n.id() },
          position: n.position(),
        }),
      );
    });

    socketRef.current = io();
    socketRef.current.on('graph:add-node', (n: ElementDefinition) =>
      dispatch(addNode(n)),
    );
    socketRef.current.on('graph:add-edge', (e: ElementDefinition) =>
      dispatch(addEdge(e)),
    );

    return () => {
      cy.destroy();
      socketRef.current?.disconnect();
    };
  }, [dispatch, graph.nodes, graph.edges]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default GraphCanvas;
