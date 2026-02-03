import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

const LOD_ZOOM = 1;

const debounce = (fn, delay = 50) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const Graph = ({ elements, neighborhoodMode }) => {
  const cyRef = useRef(null);
  const cyInstance = useRef(null);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./layoutWorker.ts', import.meta.url),
    );
    workerRef.current.onmessage = (e) => {
      const cy = cyInstance.current;
      if (!cy) return;

      const { positions } = e.data;
      cy.startBatch();
      Object.keys(positions).forEach((id) => {
        cy.getElementById(id).position(positions[id]);
      });
      cy.endBatch();
    };

    return () => {
      workerRef.current && workerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    if (!cyRef.current) return;

    cyInstance.current = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'mapData(deception_score, 0, 1, orange, red)',
            label: 'data(label)',
            color: '#fff',
            'text-valign': 'center',
            'font-size': '10px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#9dbaea',
            'target-arrow-color': '#9dbaea',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        {
          selector: '.forecast',
          style: {
            'line-style': 'dashed',
            'line-color': '#ff9800',
            'target-arrow-color': '#ff9800',
            label: 'data(label)',
          },
        },
        { selector: '.hidden', style: { display: 'none' } },
        {
          selector: '.lod-hidden',
          style: { label: '', 'target-arrow-shape': 'none' },
        },
      ],
      layout: { name: 'grid', fit: true },
    });

    const cy = cyInstance.current;

    const updateLod = () => {
      const zoom = cy.zoom();
      cy.startBatch();
      if (zoom < LOD_ZOOM) {
        cy.elements().addClass('lod-hidden');
      } else {
        cy.elements().removeClass('lod-hidden');
      }
      cy.endBatch();
    };

    cy.on('zoom', debounce(updateLod, 50));
    updateLod();

    const runAsyncLayout = () => {
      workerRef.current &&
        workerRef.current.postMessage({ elements: cy.json().elements });
    };

    runAsyncLayout();

    const handleResize = debounce(() => cy.resize(), 100);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cy.destroy();
    };
  }, [elements]);

  useEffect(() => {
    const cy = cyInstance.current;
    if (!cy) return;

    const showNeighborhood = (node, hops = 2) => {
      cy.startBatch();
      cy.elements().addClass('hidden');
      let neighborhood = node;
      for (let i = 0; i < hops; i++) {
        neighborhood = neighborhood.union(neighborhood.neighborhood());
      }
      neighborhood.removeClass('hidden');
      cy.endBatch();
    };

    const reset = () => {
      cy.startBatch();
      cy.elements().removeClass('hidden');
      cy.endBatch();
    };

    const handler = (e) => showNeighborhood(e.target);

    if (neighborhoodMode) {
      cy.on('tap', 'node', handler);
    } else {
      cy.removeListener('tap', 'node', handler);
      reset();
    }
  }, [neighborhoodMode]);

  return <div id="cy" ref={cyRef} style={{ height: '80vh', width: '100%' }} />;
};

export default Graph;
