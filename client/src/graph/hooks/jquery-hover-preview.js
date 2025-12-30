import $ from 'jquery';

// Enhances Cytoscape graph: hover over .suggestion-item to highlight source/target
export function attachSuggestionHover(cy) {
  $(document).on('mouseenter', '.suggestion-item', function () {
    const src = $(this).data('source').toString();
    const tgt = $(this).data('target').toString();
    cy.elements().removeClass('preview');
    cy.$id(src).addClass('preview');
    cy.$id(tgt).addClass('preview');
  });
  $(document).on('mouseleave', '.suggestion-item', () => {
    cy.elements().removeClass('preview');
  });
}
