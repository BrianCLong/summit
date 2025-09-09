(function(){
  const post = (ev, attrs) => navigator.sendBeacon?.('/telemetry', JSON.stringify({ ev, ts: Date.now(), attrs }))
  const now = () => performance.now()
  // 1) Search start
  let t0 = 0
  document.addEventListener('input', (e)=>{
    if (e.target && (e.target.matches('input[type="search"], .DocSearch-Input'))) {
      if (!t0) t0 = now()
      post('search_input', { qlen: (e.target.value||'').length })
    }
  }, true)
  // 2) Doc click (candidate answer)
  document.addEventListener('click', (e)=>{
    const a = e.target?.closest && e.target.closest('a[href]')
    if (!a) return
    const href = a.getAttribute('href') || ''
    if (/^https?:\/\//.test(href)) return
    post('doc_click', { href, dt: t0?Math.round(now()-t0):null })
  }, true)
  // 3) Success signal: any element with [data-tta-success]
  window.addEventListener('load', ()=>{
    document.querySelectorAll('[data-tta-success]').forEach(el => {
      el.addEventListener('click', ()=>{
        post('doc_success', { path: location.pathname, tta_ms: t0?Math.round(now()-t0):null, from })
        t0 = 0
      })
    })
  })
})()thname, tta_ms: t0?Math.round(now()-t0):null })
        t0 = 0
      })
    })
  })
})()