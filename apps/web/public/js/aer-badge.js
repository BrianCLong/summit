$(function(){
  $('[data-aer]').each(function(){
    var el = $(this); var aer = el.data('aer'); try{ aer = JSON.parse(decodeURIComponent(aer)); }catch(_){}
    el.on('click', async function(){
      try{
        const res = await $.ajax({ url:'http://localhost:7201/aer/verify', method:'POST', contentType:'application/json', data: JSON.stringify({ aer }) });
        if (res.ok) { el.text('AER ✓').css('background','#d7ffd7'); } else { el.text('AER ✕').css('background','#ffd7d7'); }
      }catch(e){ el.text('AER ?'); }
    });
  });
});