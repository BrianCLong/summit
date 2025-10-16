import * as grpc from '@grpc/grpc-js';

type TargetState = { addr: string; healthy: boolean; failures: number };
const targets: TargetState[] = (process.env.WORKERS || 'python-runner:50051')
  .split(',')
  .filter(Boolean)
  .map((addr) => ({ addr, healthy: true, failures: 0 }));

let rr = 0;
const MAX_INFLIGHT = Number(process.env.WORKER_MAX_INFLIGHT || 100);
let inflight = 0;

function pickTarget(): TargetState | null {
  const healthy = targets.filter((t) => t.healthy);
  if (!healthy.length) return null;
  rr = (rr + 1) % healthy.length;
  return healthy[rr];
}

export async function executeOnWorker(
  step: { id: string; type: string; inputs?: any },
  runId: string,
): Promise<any> {
  if (inflight >= MAX_INFLIGHT) {
    await new Promise((r) => setTimeout(r, 50));
  }
  const t = pickTarget();
  if (!t) throw new Error('no healthy workers');
  inflight++;
  try {
    // Lazy import generated client at runtime (placeholder path)
    const { StepRunnerClient } = await import('./gen/runner_grpc_pb');
    const { StepRequest } = await import('./gen/runner_pb');
    const client = new (StepRunnerClient as any)(
      t.addr,
      grpc.credentials.createInsecure(),
    );
    const req = new (StepRequest as any)();
    req.setRunId(runId);
    req.setStepId(step.id);
    req.setType(step.type);
    req.setPayloadJson(JSON.stringify(step.inputs || {}));
    return new Promise((resolve, reject) => {
      client.execute(req, (err: any, res: any) => {
        if (err) {
          t.failures++;
          if (t.failures > 3) t.healthy = false;
          reject(err);
        } else {
          t.failures = 0;
          t.healthy = true;
          resolve(res);
        }
      });
    });
  } finally {
    inflight--;
  }
}

// Basic health check loop
export function startWorkerHealthLoop() {
  setInterval(async () => {
    for (const t of targets) {
      try {
        const sock = new grpc.Client(t.addr, grpc.credentials.createInsecure());
        sock.close();
        t.healthy = true;
        t.failures = 0;
      } catch {
        t.failures++;
        if (t.failures > 3) t.healthy = false;
      }
    }
  }, 5000);
}
