import $ from 'jquery';
export function attachAlertHighlight(cy) {
  $(document).on('mouseenter', '.alert-item', function() {
    var ids = ($(this).data('nodes') || '').toString().split(',');
    cy.elements().removeClass('alert-preview');
    ids.forEach(function(id){ cy.$id(id).addClass('alert-preview'); });
  });
  $(document).on('mouseleave', '.alert-item', function() {
    cy.elements().removeClass('alert-preview');
  });
}
