import $ from 'jquery';
export function wireContextMenu(cy, openSimilar) {
  $(cy.container()).on('contextmenu', (e) => {
    e.preventDefault();
  });
  cy.on('cxttap', 'node', (evt) => {
    const node = evt.target;
    // lightweight menu: for now, trigger callback
    openSimilar(node.data('id'));
  });
}
