import { EventLogWriter } from "../logging/event-log.js";
import { AgentOrchestrator } from "../orchestrator/agent-orchestrator.js";
import { UncertaintyEvolutionWorker } from "../orchestrator/uncertainty/evolution.js";
import { globalRegistry } from "../orchestrator/uncertainty/registry.js";
import type { Agent, AgentTask } from "../types.js";

const demoAgent: Agent = {
  name: "uncertainty-agent",
  canHandle: () => true,
  execute(task: AgentTask) {
    return {
      task_id: task.id,
      status: "success",
      // Outputs that will trigger sensors
      outputs: {
        echoed: task.inputs,
        answers: ["A", "B", "C"], // triggers DisagreementSensor
        probabilities: [0.1, 0.2, 0.7], // triggers DiverseAgentEntropySensor
        supporting_evidence: [],
        required_evidence: 2, // triggers EvidenceSparsitySensor
      },
      attempt: 1,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    };
  },
};

const tasks: AgentTask[] = [
  {
    id: "demo-task-low-risk",
    priority: 10,
    created_at: new Date().toISOString(),
    type: "demo",
    inputs: { message: "should generate uncertainty records" },
    metadata: { task_risk: "low" }, // Will not be blocked
  },
  {
    id: "demo-task-blocked",
    priority: 10,
    created_at: new Date().toISOString(),
    type: "demo",
    inputs: { message: "should be blocked by policy on next run" },
    metadata: { task_risk: "high" }, // Might be blocked or adapted
  },
];

const run = async (): Promise<void> => {
  const orchestrator = new AgentOrchestrator([demoAgent], new EventLogWriter());

  // eslint-disable-next-line no-console
  console.log("--- RUNNING FIRST TIME ---");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const summary1 = await orchestrator.run([tasks[0]]);

  // eslint-disable-next-line no-console
  console.log("Uncertainty Records after Run 1:");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(globalRegistry.getAll(), null, 2));

  // Set up blocked task to fail immediately on run by pre-populating high uncertainty
  globalRegistry.createRecord(tasks[1].id, { epistemic_score: 0.9, evidence_coverage: 0.1 });

  // eslint-disable-next-line no-console
  console.log("\n--- RUNNING SECOND TIME (with policy failure) ---");
  const summary2 = await orchestrator.run([tasks[1]]);
  // eslint-disable-next-line no-console
  console.log("Run 2 Summary:");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary2.results, null, 2));

  // eslint-disable-next-line no-console
  console.log("\n--- RUNNING EVOLUTION WORKER ---");
  const worker = new UncertaintyEvolutionWorker(globalRegistry);
  worker.evolveAll();
  // eslint-disable-next-line no-console
  console.log("Uncertainty Records after Evolution:");
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(globalRegistry.getAll(), null, 2));
};

void run();
