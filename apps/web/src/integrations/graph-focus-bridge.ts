import $ from 'jquery'
export function attachGraphFocusBridge(cy: any) {
  const $c = $(cy.container())
  cy.on('boxstart', () => $c.trigger('intelgraph:graph:lasso_start'))
  cy.on('boxend', () => $c.trigger('intelgraph:graph:lasso_end'))
}
