import { writeDeterministicArtifacts } from './evidence-ledger.js';

export interface StackEvent {
  id: string;
  type: string;
  payload: any;
}

export interface StackRun {
  runId: string;
  lane: "automation" | "factory" | "recursive" | "research";
  taskGraphId: string;
  evidenceIds: string[];
}

export async function buildTaskGraph(event: StackEvent): Promise<any> {
  return { id: `tg-${event.id}`, steps: [] };
}

export async function dispatchPlan(plan: any): Promise<StackRun> {
  return {
    runId: `run-${plan.id}`,
    lane: "automation",
    taskGraphId: plan.id,
    evidenceIds: [`ev-${plan.id}`]
  };
}

export async function orchestrate(event: StackEvent): Promise<StackRun> {
  const plan = await buildTaskGraph(event);
  const run = await dispatchPlan(plan);
  await writeDeterministicArtifacts(run);
  return run;
}
