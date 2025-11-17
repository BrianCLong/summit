import $ from 'jquery'
import type Cytoscape from 'cytoscape'
export function attachGraphFocusBridge(cy: Cytoscape.Core) {
  const $c = $(cy.container())
  cy.on('boxstart', () => $c.trigger('intelgraph:graph:lasso_start'))
  cy.on('boxend', () => $c.trigger('intelgraph:graph:lasso_end'))
}
