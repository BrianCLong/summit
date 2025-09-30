import { useEffect, useState } from 'react';
import { evaluatePolicy } from '../lib/policy/policyGate';
import { Alert, Box } from ' @mui/material';

export default function PolicyGate({ subject, action, resource, context, children, fallback = null }) {
  const [state, setState] = useState({ loading: true, allow: false, reason: '' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await evaluatePolicy({ subject, action, resource, context });
      if (mounted) setState({ loading: false, allow: res.allow, reason: res.reason });
    })();
    return () => { mounted = false; };
  }, [subject, action, resource, context]);

  if (state.loading) return <Box sx={{ p: 1 }} />;
  if (!state.allow) return fallback ?? <Alert severity="warning">Blocked by policy: {state.reason}</Alert>;
  return children;
}