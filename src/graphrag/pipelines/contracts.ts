import type { DeclarativeDataset, DeclarativePipeline } from "./spec";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDataset(dataset: DeclarativeDataset, index: number): void {
  if (!dataset.name) {
    throw new Error(`Dataset at index ${index} is missing name`);
  }
  if (!dataset.source) {
    throw new Error(`Dataset ${dataset.name} is missing source`);
  }
  if (!isRecord(dataset.schema) || Object.keys(dataset.schema).length === 0) {
    throw new Error(`Dataset ${dataset.name} requires a non-empty schema`);
  }
}

export function validatePipeline(pipeline: DeclarativePipeline): void {
  if (!pipeline.id) {
    throw new Error("Missing pipeline id");
  }
  if (!pipeline.version) {
    throw new Error("Missing pipeline version");
  }
  if (!Array.isArray(pipeline.datasets) || pipeline.datasets.length === 0) {
    throw new Error("At least one dataset required");
  }
  if (!Array.isArray(pipeline.dependencies)) {
    throw new Error("Dependencies must be an array");
  }
  if (pipeline.materialization !== "batch" && pipeline.materialization !== "stream") {
    throw new Error("Materialization must be batch or stream");
  }

  pipeline.datasets.forEach((dataset, index) => validateDataset(dataset, index));
}

export function parsePipeline(input: unknown): DeclarativePipeline {
  if (!isRecord(input)) {
    throw new Error("Pipeline payload must be an object");
  }

  const allowedKeys = new Set(["id", "version", "datasets", "dependencies", "materialization"]);

  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unknown pipeline field: ${key}`);
    }
  }

  const pipeline = input as DeclarativePipeline;
  validatePipeline(pipeline);
  return pipeline;
}
