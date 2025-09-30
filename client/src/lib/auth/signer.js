// Simple HMAC signer + token refresh.
// Server should accept: `Authorization: HMAC <keyId>:<ts>:<sig>`
// and cookie/headers for session if needed.

const API = import.meta.env.VITE_COMPANYOS_API;
let keyId = null;
let secret = null;
let lastRefresh = 0;

async function hmacSHA256(message, key) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function ensureKey() {
  // Try secure store first (if tauri present)
  const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
  if (invoke) {
    keyId ||= await invoke('secure_store_get', { key: 'api.keyId' }) || null;
    secret ||= await invoke('secure_store_get', { key: 'api.secret' }) || null;
  }
  if (!keyId || !secret) {
    // fallback: ask server (rotating demo key)
    const r = await fetch(`${API}/v1/auth/hmac-key`, { credentials: 'include' });
    if (r.ok) {
      const j = await r.json();
      keyId = j.keyId; secret = j.secret;
      if (invoke) {
        try { await invoke('secure_store_set', { key: 'api.keyId', value: keyId }); } catch {}
        try { await invoke('secure_store_set', { key: 'api.secret', value: secret }); } catch {}
      }
    }
  }
}

async function refreshSessionIfNeeded() {
  const now = Date.now();
  if (now - lastRefresh < 4 * 60 * 1000) return; // 4min
  lastRefresh = now;
  try { await fetch(`${API}/v1/auth/refresh`, { credentials: 'include' }); } catch {}
}

export async function signedFetch(path, { method = 'GET', headers = {}, body, ...rest } = {}) {
  await ensureKey();
  await refreshSessionIfNeeded();
  const ts = Math.floor(Date.now() / 1000).toString();
  const target = path.startsWith('http') ? path : `${API}${path}`;
  const contentHash = body ? await hmacSHA256(typeof body === 'string' ? body : JSON.stringify(body), secret) : '';
  const toSign = [method.toUpperCase(), new URL(target).pathname, ts, contentHash].join('\n');
  const sig = keyId && secret ? await hmacSHA256(toSign, secret) : '';
  const auth = keyId ? `HMAC ${keyId}:${ts}:${sig}` : undefined;

  return fetch(target, {
    method,
    headers: { ...(auth ? { Authorization: auth } : {}), 'Content-Type': 'application/json', ...headers },
    body: body && typeof body !== 'string' ? JSON.stringify(body) : body,
    credentials: 'include',
    ...rest,
  });
}
