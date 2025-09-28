$(function(){
  const socket = io(); // assume /socket.io from api proxy
  let currentCaseId = null; // To store the ID of the currently active case

  $('#toggle-coord').on('click', function () {
    const on = $(this).is(':checked');
    cy.edges('[type = "COORDINATION"]').style({
      'line-opacity': on ? 1 : 0.15,
      'width': on ? 'mapData(score, 0, 10, 1, 8)' : 1
    });
    socket.emit('overlay:coordination', { enabled: on });
  });

  socket.on('alerts.coord', function (evt) {
    if (evt.type === 'coord_pair') {
      $('#snackbar').text(`Coordination spike: ${evt.payload.a} ↔ ${evt.payload.b}`).fadeIn().delay(2500).fadeOut();
    }
  });

  socket.on('cases.autocreate', function (evt) {
    currentCaseId = evt.case_id; // Store the new case ID
    $.ajax({ url: `/api/cases/${evt.case_id}`, method: 'GET' })
    .done(function (data) { openCase(data); });
  });

  $('#btn-export').on('click', function(){
    if (!currentCaseId) {
      alert('No active case to export.');
      return;
    }
    // Placeholder for userRole, ideally fetched from auth context
    const userRole = window.userRole || 'analyst'; 
    $.ajax({ url:`/api/exports/case/${currentCaseId}`, method:'GET', headers:{"X-Role": userRole} })
      .done(function(data){ downloadJSON(data, `case_${currentCaseId}.json`); })
      .fail(function(xhr){ alert(`Export denied: ${xhr.responseJSON?.detail||xhr.status}`); });
  });

  $('#btn-summarize').on('click', function(){
    if (!currentCaseId) {
      alert('No active case to summarize.');
      return;
    }
    $.ajax({ url:`/api/cases/${currentCaseId}/summarize`, method:'POST' })
      .done(function(data){ alert(`Case ${currentCaseId} summarized.`); /* Optionally update UI with summary */ })
      .fail(function(xhr){ alert(`Failed to summarize case: ${xhr.responseJSON?.detail||xhr.status}`); });
  });

  $('#btn-download-bundle').on('click', function(){
    if (!currentCaseId) {
      alert('No active case to download bundle for.');
      return;
    }
    const userRole = window.userRole || 'analyst'; 
    window.location.href = `/api/exports/bundle/${currentCaseId}?X-Role=${userRole}`;
  });

  $('#case-template-select').on('change', function(){
    const templateName = $(this).val();
    if (templateName && currentCaseId) {
      $.ajax({ url:`/api/cases/${currentCaseId}/apply-template/${templateName}`, method:'POST' })
        .done(function(data){ alert(`Template ${templateName} applied to case ${currentCaseId}.`); })
        .fail(function(xhr){ alert(`Failed to apply template: ${xhr.responseJSON?.detail||xhr.status}`); });
    }
    $(this).val(''); // Reset dropdown
  });

  // Helper function to download JSON data
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function openExplainEdge(a,b){
    $.getJSON(`/api/explain/edge?a=${a}&b=${b}`, function(data){
      $('#exp-score').text(data.score);
      $('#exp-tags').empty().append((data.tags||[]).map(t=>`<span class="chip">#${t}</span>`));
      $('#exp-examples').empty().append((data.examples||[]).map(e=>`<div class="ex"><div>${e.a_text||''}</div><div>${e.b_text||''}</div>${e.url?`<a href="${e.url}" target="_blank">link</a>`:''}</div>`));
      $('#explain-modal').css('display', 'block'); // Use css to show/hide
    });
  }
  cy.on('tap', 'edge[type="COORDINATION"]', function(evt){
    const a = evt.target.data('source'); const b = evt.target.data('target');
    openExplainEdge(a,b);
  });

  // Placeholder for openCase function, already defined in index.html script block
  // function openCase(caseData) { ... }
});