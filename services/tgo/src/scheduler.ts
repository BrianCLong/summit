export function assign(tasks: Task[], workers: Worker[]) {
  const W = workers.sort(
    (a, b) => a.costPerMin - b.costPerMin || a.maxParallel - b.maxParallel,
  );
  const plan: Record<string, Task[]> = Object.fromEntries(
    W.map((w) => [w.id, []]),
  );
  for (const t of tasks.sort((a, b) => b.estSec - a.estSec)) {
    // big first
    const feasible = W.filter((w) => t.caps.every((c) => w.caps.includes(c)));
    (feasible[0] ? plan[feasible[0].id] : plan[W[0].id]).push(t);
  }
  return plan;
}
