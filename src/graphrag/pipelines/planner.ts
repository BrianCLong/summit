import type { DeclarativePipeline } from "./spec";

export function resolveOrder(pipelines: DeclarativePipeline[]): string[] {
  const idToPipeline = new Map(pipelines.map((pipeline) => [pipeline.id, pipeline]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(pipelineId: string): void {
    if (visited.has(pipelineId)) {
      return;
    }
    if (visiting.has(pipelineId)) {
      throw new Error(`Cyclic dependency detected at ${pipelineId}`);
    }

    const pipeline = idToPipeline.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Unknown dependency: ${pipelineId}`);
    }

    visiting.add(pipelineId);
    for (const dependencyId of pipeline.dependencies) {
      visit(dependencyId);
    }
    visiting.delete(pipelineId);
    visited.add(pipelineId);
    order.push(pipelineId);
  }

  for (const pipeline of pipelines) {
    visit(pipeline.id);
  }

  return order;
}
