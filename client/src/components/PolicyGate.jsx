import { useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';

async function evalNative(input) {
  try {
    // Tauri v2: window.__TAURI__ is present; command name 'policy_eval'
    const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (!invoke) return null;
    const res = await invoke('policy_eval', { input }); // {allow, reason}
    return res;
  } catch { return null; }
}

async function evalHttp(input) {
  const url = import.meta.env.VITE_COMPANYOS_API && `${import.meta.env.VITE_COMPANYOS_API}/v1/policy/eval`;
  if (!url) return null;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(input), credentials: 'include' });
    if (!r.ok) throw 0;
    return await r.json(); // {allow, reason}
  } catch { return null; }
}

export default function PolicyGate({ subject, action, resource, context, children, fallback = null }) {
  const [state, setState] = useState({ loading: true, allow: false, reason: '' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const input = { subject, action, resource, context };
      const res = await (evalNative(input) || evalHttp(input) || Promise.resolve({ allow: true, reason: 'fallback allow (dev)' }));
      if (mounted) setState({ loading: false, allow: !!res?.allow, reason: res?.reason || '' });
    })();
    return () => { mounted = false; };
  }, [subject, action, resource, context]);

  if (state.loading) return <Box sx={{ p: 1 }} />;
  if (!state.allow) return fallback ?? <Alert severity="warning">Blocked by policy: {state.reason || 'denied'}</Alert>;
  return children;
}