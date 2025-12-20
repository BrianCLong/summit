declare module '@intelgraph/etl-assistant' {
  export type CanonicalEntityType = string;
  export type RedactionStrategy = string;

  export class ETLAssistant {
    getSchemaInference(): {
      inferSchema: (...args: unknown[]) => unknown;
    };
    getPIIDetection(): {
      detectPII: (...args: unknown[]) => unknown;
    };
  }
}
