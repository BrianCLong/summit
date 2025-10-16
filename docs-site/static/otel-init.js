(function () {
  // Minimal OTel web SDK wiring (pseudo; plug your exporter)
  // Avoid PII: hash pathnames; never send query strings.
  function sha1(s) {
    return s;
  } // stub; replace with real hash if needed
  function post(url, body) {
    try {
      navigator.sendBeacon?.(url, JSON.stringify(body));
    } catch (e) {}
  }
  const endpoint = '/telemetry'; // replace with your collector/edge fn
  function send(ev, attrs) {
    post(endpoint, { ev, t: Date.now(), attrs });
  }
  // Page views
  send('page_view', { path: sha1(location.pathname) });
  // DocSearch queries (DocSearch attaches to .DocSearch-Button or input)
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el || !el.matches) return;
    if (el.matches('input[type="search"], .DocSearch-Input')) {
      const q = (el.value || '').trim();
      if (q.length > 2) send('search', { qlen: q.length });
    }
  });
  // Broken links (client-side navigations that 404)
  window.addEventListener(
    'error',
    (e) => {
      if (e && e.target && e.target.tagName === 'A') {
        send('link_error', { href: e.target.href });
      }
    },
    true,
  );
})();
