// Worker SDK heartbeat (TypeScript, excerpt)
// This is a placeholder for the actual worker SDK implementation.

/**
 * Represents a leased task.
 */
interface Lease {
  id: string;
  // ... other lease properties
}

/**
 * Represents the result of a task execution.
 */
interface TaskResult {
  checkpoint: any;
  artifacts: any;
}

/**
 * A function that handles a leased task.
 *
 * @param lease - The task lease.
 * @param options - Options including an abort signal.
 * @returns A promise resolving to the task result.
 */
interface TaskHandler {
  (lease: Lease, options: { signal: AbortSignal }): Promise<TaskResult>;
}

/**
 * Client for communicating with the Conductor service.
 */
interface ConductorClient {
  /** Leases a new task from the queue. */
  leaseTask(): Promise<Lease | null>;
  /** Renews an existing lease to prevent timeout. */
  renewLease(leaseId: string): Promise<void>;
  /** Acknowledges successful task completion. */
  ackTask(leaseId: string, checkpoint: any, artifacts: any): Promise<void>;
  /** Negative acknowledgment for failed tasks. */
  nackTask(leaseId: string, retryable: boolean, error: string): Promise<void>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(e: any): boolean {
  // Implement logic to determine if an error is retryable
  return false;
}

/**
 * Runs a continuous loop to fetch and process tasks.
 * Handles lease renewal, task execution, and acknowledgment (ack/nack).
 *
 * @param client - The Conductor client instance.
 * @param handler - The task handler function.
 */
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
