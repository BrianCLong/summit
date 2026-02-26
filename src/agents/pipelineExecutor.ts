import { resolveOrder } from "../graphrag/pipelines/planner";
import { validatePipeline } from "../graphrag/pipelines/contracts";
import type { DeclarativePipeline } from "../graphrag/pipelines/spec";

export interface PipelineTask {
  id: string;
  pipelineId: string;
  blockedBy: string[];
}

export function planPipelineTasks(pipelines: DeclarativePipeline[]): PipelineTask[] {
  pipelines.forEach((pipeline) => validatePipeline(pipeline));

  const order = resolveOrder(pipelines);
  const byId = new Map(pipelines.map((pipeline) => [pipeline.id, pipeline]));

  return order.map((pipelineId) => {
    const pipeline = byId.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Missing pipeline for task planning: ${pipelineId}`);
    }

    return {
      id: `task:${pipeline.id}`,
      pipelineId: pipeline.id,
      blockedBy: [...pipeline.dependencies],
    };
  });
}
