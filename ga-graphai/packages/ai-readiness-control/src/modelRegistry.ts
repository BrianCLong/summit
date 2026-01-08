import { ModelVersion } from "./types.js";

export class ModelRegistry {
  private readonly models = new Map<string, ModelVersion[]>();

  register(model: ModelVersion): void {
    const versions = this.models.get(model.modelId) ?? [];
    if (versions.some((existing) => existing.version === model.version)) {
      throw new Error(`Model ${model.modelId} already has version ${model.version}`);
    }
    this.models.set(model.modelId, [...versions, model]);
  }

  latest(modelId: string): ModelVersion | undefined {
    const versions = this.models.get(modelId) ?? [];
    return versions.sort((a, b) => a.version.localeCompare(b.version)).at(-1);
  }

  rollback(modelId: string, version: string, reason: string): void {
    const versions = this.models.get(modelId) ?? [];
    const found = versions.find((candidate) => candidate.version === version);
    if (!found) {
      throw new Error(`Model ${modelId}@${version} not registered`);
    }
    found.rolledBack = true;
    found.rollbackReason = reason;
  }

  list(): ModelVersion[] {
    return Array.from(this.models.values()).flat();
  }
}
