// apps/web/src/lib/api/maestro.ts

export interface MaestroRunResponse {
  run: {
    id: string;
    user: { id: string };
    createdAt: string;
    requestText: string;
    status?: 'running' | 'completed' | 'failed';
  };
  tasks: Array<{
    id: string;
    status: string;
    description: string;
  }>;
  results: Array<{
    task: {
      id: string;
      status: string;
      description: string;
      errorMessage?: string;
    };
    artifact: {
      id: string;
      kind: string;
      label: string;
      data: any;
      createdAt: string;
    } | null;
  }>;
  costSummary: {
    runId: string;
    totalCostUSD: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    byModel: Record<string, {
      costUSD: number;
      inputTokens: number;
      outputTokens: number;
    }>;
  };
}

export async function runMaestroRequest(params: { userId: string; requestText: string }): Promise<MaestroRunResponse> {
  const res = await fetch('/api/maestro/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error('Failed to run Maestro pipeline');
  }
  return res.json();
}

export async function getMaestroRun(runId: string): Promise<MaestroRunResponse> {
  const res = await fetch(`/api/maestro/runs/${runId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch run');
  }
  return res.json();
}
