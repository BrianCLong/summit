import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

const Graph = ({ elements }) => {
  const cyRef = useRef(null);

  useEffect(() => {
    if (cyRef.current) {
      const cy = cytoscape({
        container: cyRef.current,
        elements: elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#61DAFB',
              'label': 'data(label)',
              'color': '#fff',
              'text-valign': 'center',
              'font-size': '10px'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#9dbaea',
              'target-arrow-color': '#9dbaea',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier'
            }
          }
        ],
        layout: {
          name: 'cose-bilkent',
          animate: 'end',
          animationEasing: 'ease-out',
          animationDuration: 1000,
          randomize: true
        }
      });
    }
  }, [elements]);

  return <div id="cy" ref={cyRef} style={{ height: '80vh', width: '100%' }} />;
};

export default Graph;
