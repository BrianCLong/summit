const invoke = () => window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;

export function hasTauri() {
  return typeof window !== 'undefined' && !!invoke();
}
export async function tauriInvoke(cmd, payload) {
  return invoke()(cmd, payload);
}

export async function kvSet(key, value) {
  if (hasTauri()) return tauriInvoke('secure_store_set', { key, value });
  // fallback localStorage
  localStorage.setItem(`kv:${key}`, JSON.stringify(value));
}

export async function kvGet(key) {
  if (hasTauri()) return tauriInvoke('secure_store_get', { key });
  const raw = localStorage.getItem(`kv:${key}`);
  return raw ? JSON.parse(raw) : null;
}

export async function kvDel(key) {
  if (hasTauri()) return tauriInvoke('secure_store_del', { key });
  localStorage.removeItem(`kv:${key}`);
}

// Soft rotation: write new, keep old under suffix until verified.
export async function rotateSecret(key, newValue){
  const old = await kvGet(key);
  await kvSet(`${key}.pending`, newValue);
  return {
    confirm: async () => { await kvSet(key, newValue); await kvSet(`${key}.pending`, ''); },
    rollback: async () => { if (old != null) await kvSet(key, old); await kvSet(`${key}.pending`, ''); }
  };
}