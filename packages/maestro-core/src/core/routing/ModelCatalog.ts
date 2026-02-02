import type { ModelConfig } from "./types";

export class ModelCatalog {
  private readonly models: ModelConfig[];

  constructor(models: ModelConfig[]) {
    if (!models.length) throw new Error("ModelCatalog requires at least one model");
    this.models = models;
  }

  list(): ModelConfig[] {
    return [...this.models];
  }

  byId(id: string): ModelConfig | undefined {
    return this.models.find(m => m.id === id);
  }
}
