import $ from 'jquery';

// Enhances Cytoscape graph: hover over .suggestion-item to highlight source/target
export function attachSuggestionHover(cy) {
  $(document).on('mouseenter', '.suggestion-item', function() {
    var src = $(this).data('source').toString();
    var tgt = $(this).data('target').toString();
    cy.elements().removeClass('preview');
    cy.$id(src).addClass('preview');
    cy.$id(tgt).addClass('preview');
  });
  $(document).on('mouseleave', '.suggestion-item', function() {
    cy.elements().removeClass('preview');
  });
}
