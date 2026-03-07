import type { RecordDefinition } from "@intelgraph/mdm-core";

export class RecordDefinitionRegistry {
  private definitions: Map<string, RecordDefinition> = new Map();

  register(definition: RecordDefinition): void {
    this.definitions.set(definition.type, definition);
  }

  get(recordType: string): RecordDefinition | undefined {
    return this.definitions.get(recordType);
  }

  validate(recordType: string, payload: unknown): void {
    const definition = this.get(recordType);
    if (!definition) {
      throw new Error(`Record definition ${recordType} not registered`);
    }

    definition.schema.parse(payload);
  }

  list(): RecordDefinition[] {
    return Array.from(this.definitions.values());
  }
}
