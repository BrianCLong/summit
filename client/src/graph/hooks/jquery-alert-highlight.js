import $ from 'jquery';
export function attachAlertHighlight(cy) {
  $(document).on('mouseenter', '.alert-item', function () {
    const ids = ($(this).data('nodes') || '').toString().split(',');
    cy.elements().removeClass('alert-preview');
    ids.forEach((id) => {
      cy.$id(id).addClass('alert-preview');
    });
  });
  $(document).on('mouseleave', '.alert-item', () => {
    cy.elements().removeClass('alert-preview');
  });
}
