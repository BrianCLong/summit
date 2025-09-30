import { hasTauri, tauriInvoke } from '../runtime/ipc';

const API = import.meta.env.VITE_COMPANYOS_API;

export async function evaluatePolicy({ subject, action, resource, context }) {
  // 1) Native policy check (Tauri secure IPC)
  if (hasTauri()) {
    try {
      const res = await tauriInvoke('policy_eval', { subject, action, resource, context });
      if (typeof res?.allow === 'boolean') return res;
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[policy] tauri invoke failed', e);
    }
  }

  // 2) CompanyOS REST
  if (API) {
    try {
      const r = await fetch(`${API}/v1/policy/eval`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, action, resource, context })
      });
      if (r.ok) {
        const json = await r.json();
        if (typeof json?.allow === 'boolean') return json;
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[policy] REST failed', e);
    }
  }

  // 3) Local stub fallback
  const allow = subject?.authenticated && ['render_widget', 'perform_action'].includes(action);
  return { allow, reason: allow ? 'ok' : 'blocked (demo gate)' };
}