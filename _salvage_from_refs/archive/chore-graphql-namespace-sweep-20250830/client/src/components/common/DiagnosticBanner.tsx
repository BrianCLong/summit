import React from 'react';
import { Alert, AlertTitle, Link, Stack } from '@mui/material';

export default function DiagnosticBanner() {
  const apiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  const wsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;

  const issues: string[] = [];
  if (!apiUrl) issues.push('VITE_API_URL is not set');
  if (!wsUrl) issues.push('VITE_WS_URL is not set');

  if (issues.length === 0) return null;

  return (
    <Alert severity="warning" sx={{ mb: 2 }} role="status" aria-live="polite">
      <AlertTitle>Configuration Required</AlertTitle>
      <Stack spacing={0.5}>
        {issues.map((m) => (
          <span key={m}>• {m}</span>
        ))}
        <span>
          See <Link href="/README#environment" underline="hover">Environment setup</Link> or set values in your <code>.env</code>.
        </span>
      </Stack>
    </Alert>
  );
}

