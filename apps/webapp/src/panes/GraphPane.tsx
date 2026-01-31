import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { useDispatch } from 'react-redux';
import { fetchGraph } from '../data/mockGraph';
import { selectNode } from '../store';
import { trackGoldenPathStep } from '../telemetry';

export function GraphPane() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    fetchGraph().then((data) => {
      if (!containerRef.current) return;

      const cy = cytoscape({
        container: containerRef.current!,
        elements: [
          ...data.nodes.map((n) => ({ data: { id: n.id, label: n.label } })),
          ...data.edges.map((e) => ({
            data: { id: e.id, source: e.source, target: e.target },
          })),
        ],
        style: [{ selector: 'node', style: { label: 'data(label)' } }],
        layout: { name: 'grid' },
      });

      cy.on('select', (evt) => dispatch(selectNode(evt.target.id())));
      cy.on('unselect', () => dispatch(selectNode(null)));

      const container = cy.container() as HTMLElement;

      // Native drag stub
      const onMouseUp = () => {
        document.removeEventListener('mouseup', onMouseUp);
      };

      const onMouseDown = () => {
        document.addEventListener('mouseup', onMouseUp);
      };

      container.addEventListener('mousedown', onMouseDown);

      // Native context menu stub
      const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      container.addEventListener('contextmenu', onContextMenu);
      trackGoldenPathStep('graph_pane_loaded', 'success');
    });
  }, [dispatch]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
