import type { Trajectory } from "./types.js";

export function generateTrajectory(task: string, retrievedDocs: any[], subgraph: any): Trajectory {
  return {
    taskId: task,
    modality: "text",
    steps: [],
    claims: [],
    policy: { piiRisk: "low", blocked: false, reasons: [] }
  };
}
