// Worker SDK heartbeat (TypeScript, excerpt)
// This is a placeholder for the actual worker SDK implementation.

interface Lease {
  id: string;
  // ... other lease properties
}

interface TaskResult {
  checkpoint: any;
  artifacts: any;
}

interface TaskHandler {
  (lease: Lease, options: { signal: AbortSignal }): Promise<TaskResult>;
}

interface ConductorClient {
  leaseTask(): Promise<Lease | null>;
  renewLease(leaseId: string): Promise<void>;
  ackTask(leaseId: string, checkpoint: any, artifacts: any): Promise<void>;
  nackTask(leaseId: string, retryable: boolean, error: string): Promise<void>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(e: any): boolean {
  // Implement logic to determine if an error is retryable
  return false;
}

export async function runTaskLoop(
  client: ConductorClient,
  handler: TaskHandler,
) {
  while (true) {
    const lease = await client.leaseTask();
    if (!lease) {
      await sleep(250);
      continue;
    }

    const ctrl = new AbortController();
    const hb = setInterval(
      () => client.renewLease(lease.id).catch(() => ctrl.abort()),
      2000,
    );

    try {
      const res = await handler(lease, { signal: ctrl.signal });
      await client.ackTask(lease.id, res.checkpoint, res.artifacts);
    } catch (e) {
      const retryable = isRetryable(e);
      await client.nackTask(lease.id, retryable, String(e)); // Convert error to string
    } finally {
      clearInterval(hb);
    }
  }
}
