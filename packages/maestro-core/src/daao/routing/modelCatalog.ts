export interface ModelSpec {
  id: string; // provider/model-name
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  capabilities: {
    jsonMode: boolean;
    functionCalling: boolean;
    vision: boolean;
  };
  domains: string[]; // e.g. ["coding", "creative", "reasoning"]
  tier: "low" | "medium" | "high";
}

export interface ModelCatalog {
  listModels(): ModelSpec[];
  getModel(id: string): ModelSpec | undefined;
  getCheapestModel(capabilities?: Partial<ModelSpec['capabilities']>): ModelSpec;
  getBestModel(domains?: string[]): ModelSpec;
}

export class DefaultModelCatalog implements ModelCatalog {
  private models: ModelSpec[] = [
    {
      id: "openai/gpt-4o-mini",
      provider: "openai",
      contextWindow: 128000,
      maxOutputTokens: 16384,
      costPerInputToken: 0.15 / 1000000,
      costPerOutputToken: 0.60 / 1000000,
      capabilities: { jsonMode: true, functionCalling: true, vision: true },
      domains: ["general", "fast"],
      tier: "low"
    },
    {
      id: "openai/gpt-4o",
      provider: "openai",
      contextWindow: 128000,
      maxOutputTokens: 4096,
      costPerInputToken: 2.50 / 1000000,
      costPerOutputToken: 10.00 / 1000000,
      capabilities: { jsonMode: true, functionCalling: true, vision: true },
      domains: ["general", "complex", "coding", "reasoning"],
      tier: "high"
    },
    {
      id: "anthropic/claude-3-haiku-20240307",
      provider: "anthropic",
      contextWindow: 200000,
      maxOutputTokens: 4096,
      costPerInputToken: 0.25 / 1000000,
      costPerOutputToken: 1.25 / 1000000,
      capabilities: { jsonMode: true, functionCalling: true, vision: true },
      domains: ["general", "fast"],
      tier: "low"
    },
    {
      id: "anthropic/claude-3-5-sonnet-20240620",
      provider: "anthropic",
      contextWindow: 200000,
      maxOutputTokens: 8192,
      costPerInputToken: 3.00 / 1000000,
      costPerOutputToken: 15.00 / 1000000,
      capabilities: { jsonMode: true, functionCalling: true, vision: true },
      domains: ["general", "coding", "reasoning", "writing"],
      tier: "high"
    }
  ];

  listModels(): ModelSpec[] {
    return [...this.models];
  }

  getModel(id: string): ModelSpec | undefined {
    return this.models.find(m => m.id === id);
  }

  getCheapestModel(capabilities?: Partial<ModelSpec['capabilities']>): ModelSpec {
    let candidates = this.models;
    if (capabilities) {
      candidates = candidates.filter(m =>
        Object.entries(capabilities).every(([k, v]) => !v || m.capabilities[k as keyof ModelSpec['capabilities']])
      );
    }
    return candidates.reduce((prev, curr) =>
      curr.costPerInputToken < prev.costPerInputToken ? curr : prev
    );
  }

  getBestModel(domains: string[] = []): ModelSpec {
    // Simple heuristic: prefer high tier, then match domains
    const highTier = this.models.filter(m => m.tier === "high");
    if (highTier.length === 0) return this.models[0];

    if (domains.length > 0) {
      // Find model with most matching domains
      const sorted = highTier.sort((a, b) => {
        const aMatches = a.domains.filter(d => domains.includes(d)).length;
        const bMatches = b.domains.filter(d => domains.includes(d)).length;
        return bMatches - aMatches;
      });
      return sorted[0];
    }

    // Default to gpt-4o as best general purpose
    return highTier.find(m => m.id === "openai/gpt-4o") || highTier[0];
  }
}
