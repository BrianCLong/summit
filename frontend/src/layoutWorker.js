import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

self.onmessage = (e) => {
  const { elements } = e.data;
  const cy = cytoscape({
    elements,
    style: [],
    headless: true
  });
  const layout = cy.layout({ name: 'cose-bilkent', randomize: true });
  layout.run();
  const positions = {};
  cy.nodes().forEach((n) => {
    positions[n.id()] = n.position();
  });
  self.postMessage({ positions });
};
