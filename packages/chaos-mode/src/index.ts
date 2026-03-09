export class ChaosInjector {
  constructor(private config: { probability: number; active: boolean }) {}

  inject<T>(data: T): T {
    if (!this.config.active || Math.random() > this.config.probability) {
      return data;
    }

    if (typeof data === "string") {
      return `${data} [POISONED]` as unknown as T;
    }

    if (Array.isArray(data)) {
      return [...data, "hallucinated_entity"] as unknown as T;
    }

    if (typeof data === "object" && data !== null) {
      return { ...data, _corrupted: true } as unknown as T;
    }

    return data;
  }
}
