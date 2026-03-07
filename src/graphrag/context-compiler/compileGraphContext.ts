import { TaskSpec } from '../../agents/controlplane/planner/TaskSpec.js';

export interface GraphContextPackage {
  entities: string[];
  subgraph: Record<string, unknown>;
  allowedDatasets: string[];
  allowedTools: string[];
  evidenceIds: string[];
}

export async function compileGraphContext(task: TaskSpec): Promise<GraphContextPackage> {
  return {
    entities: [task.id, task.type],
    subgraph: {
      taskId: task.id,
      requiredCapabilities: task.requiredCapabilities,
      requiredDatasets: task.requiredDatasets,
    },
    allowedDatasets: [...task.requiredDatasets].sort(),
    allowedTools: [...task.requiredTools].sort(),
    evidenceIds: [`EVD-AFCP-KG-${task.id}`],
  };
}
