'use client';

import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export default function GraphPane({ data }: { data: any }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: (data.nodes || []).map((n: any) => ({
          data: { id: n.id, label: n.name, type: n.type }
        })),
        edges: (data.edges || []).map((e: any) => ({
          data: { id: e.id, source: e.source, target: e.target, label: e.type }
        }))
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': '40px',
            'height': '40px'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)'
          }
        },
        {
          selector: ':selected',
          style: {
             'background-color': 'steelBlue',
             'line-color': 'black',
             'target-arrow-color': 'black',
             'source-arrow-color': 'black'
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: false
      }
    });

    return () => {
      cy.destroy();
    };
  }, [data]);

  return (
    <div className="p-2 border h-full flex flex-col">
      <div className="font-bold border-b mb-2">Network Graph</div>
      <div ref={containerRef} className="flex-grow w-full h-[500px] bg-slate-50" />
    </div>
  );
}
