async function verify(bundleJson, pubPem) {
  // minimalist verifier (no bundling): call local server if available
  try {
    const res = await fetch('http://localhost:7102/kpw/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle: JSON.parse(bundleJson) }),
    });
    if (res.ok) {
      const j = await res.json();
      return j.ok;
    }
  } catch (_) {}
  // fallback to client-side WASM/JS? For MVP, we rely on server
  return false;
}

document.getElementById('verify').onclick = async () => {
  const bundle = document.getElementById('bundle').value.trim();
  const pub = document.getElementById('pub').value.trim();
  const ok = await verify(bundle, pub);
  const el = document.getElementById('result');
  el.innerHTML = ok
    ? '<p class="ok">✅ Verified</p>'
    : '<p class="bad">❌ Not verified</p>';
};
