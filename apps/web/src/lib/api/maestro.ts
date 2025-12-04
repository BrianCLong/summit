// src/lib/api/maestro.ts

import type { MaestroRunResponse } from '@/types/maestro';

export async function runMaestroRequest(params: {
  userId: string;
  requestText: string;
  signal?: AbortSignal;
}): Promise<MaestroRunResponse> {
  const res = await fetch('/api/maestro/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: params.userId,
      requestText: params.requestText,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Failed to run Maestro request: ${res.status} ${res.statusText} ${text}`,
    );
  }

  return res.json();
}
