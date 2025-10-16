(function () {
  // Demo: looks for elements with data-kpw-bundle attribute and injects a badge
  const nodes = document.querySelectorAll('[data-kpw-bundle]');
  for (const n of nodes) {
    const badge = document.createElement('span');
    badge.textContent = 'KPW?';
    badge.style.cssText =
      'margin-left:6px;padding:2px 6px;border-radius:8px;background:#eee;cursor:pointer;font-size:12px;';
    badge.onclick = async () => {
      try {
        const bundle = JSON.parse(n.getAttribute('data-kpw-bundle'));
        const res = await fetch('http://localhost:7102/kpw/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bundle }),
        });
        const ok = res.ok && (await res.json()).ok;
        badge.textContent = ok ? 'KPW ✓' : 'KPW ✕';
        badge.style.background = ok ? '#d7ffd7' : '#ffd7d7';
      } catch (e) {
        console.error(e);
      }
    };
    n.appendChild(badge);
  }
})();
