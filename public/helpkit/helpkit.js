(function () {
  function qs(q) {
    return document.querySelector(q);
  }
  async function load() {
    const res = await fetch('/docs/ops/help/index.json');
    const data = await res.json();
    const el = document.createElement('div');
    el.id = 'helpkit';
    el.style.position = 'fixed';
    el.style.bottom = '20px';
    el.style.right = '20px';
    el.innerHTML =
      '<button id="hk-btn">? Help</button><div id="hk-panel" hidden><input id="hk-q" placeholder="Search..."/><ul id="hk-results"></ul></div>';
    document.body.appendChild(el);
    qs('#hk-btn').onclick = () => {
      qs('#hk-panel').hidden = !qs('#hk-panel').hidden;
    };
    qs('#hk-q').oninput = (e) => {
      const q = (e.target.value || '').toLowerCase();
      const out = data
        .filter(
          (x) =>
            x.title.toLowerCase().includes(q) ||
            x.tags.join(' ').toLowerCase().includes(q),
        )
        .slice(0, 8);
      qs('#hk-results').innerHTML = out
        .map((x) => `<li><a href='/${x.slug}'>${x.title}</a></li>`)
        .join('');
    };
  }
  if (document.readyState === 'complete') load();
  else window.addEventListener('load', load);
})();
