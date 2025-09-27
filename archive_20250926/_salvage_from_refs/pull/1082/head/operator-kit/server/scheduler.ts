import { budgetFraction, powerWindowOpen } from "./metrics";
import { emit } from "./events";

type Job = { id: string; model: string; payload: any };
const queues: Record<string, Job[]> = { power: [] };

export function enqueuePower(job: Job) { queues.power.push(job); }

function budgetFrac(model: string) {
  // Placeholder: wire to your LiteLLM counters; treat as 0 here
  return 0;
}

function windowOpen(model: string) {
  // Read current gauge; if nonzero, assume open (this is illustrative)
  try {
    // no public read of prom-client gauges; assume 1 if set recently by planner
    return true;
  } catch { return false; }
}

export function startScheduler() {
  setInterval(() => {
    const q = queues.power;
    const job = q.shift();
    if (!job) return;
    if (!windowOpen(job.model) || budgetFrac(job.model) >= 0.8) {
      // requeue at tail or downgrade in your router
      q.push(job);
      return;
    }
    emit({ type: "budget.update", model: job.model, fraction: budgetFrac(job.model) });
    // dispatch(job) -> your executor
  }, 1000);
}
