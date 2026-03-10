import { writeDeterministicArtifacts } from './evidence-ledger.js';
// StackEvent is a TypeScript interface (erased at compile time); export a
// sentinel so ESM importers that reference it as a named binding don't fail.
export const StackEvent = {};
export async function buildTaskGraph(event) {
    return { id: `tg-${event.id}`, steps: [] };
}
export async function dispatchPlan(plan) {
    return {
        runId: `run-${plan.id}`,
        lane: "automation",
        taskGraphId: plan.id,
        evidenceIds: [`ev-${plan.id}`]
    };
}
export async function orchestrate(event) {
    const plan = await buildTaskGraph(event);
    const run = await dispatchPlan(plan);
    await writeDeterministicArtifacts(run);
    return run;
}
