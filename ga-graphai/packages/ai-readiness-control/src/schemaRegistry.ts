import { CanonicalEntityName, SchemaDefinition, SchemaValidationResult } from "./types.js";

type PropertySchema = { type: "string" | "number" | "boolean" | "object" };

type ObjectSchema = {
  type: "object";
  properties?: Record<string, PropertySchema>;
  required?: string[];
};

const supportedEntities: CanonicalEntityName[] = [
  "user",
  "account",
  "tenant",
  "asset",
  "document",
  "ticket",
  "runbook",
  "model",
  "dataset",
  "feature",
  "automation",
  "policy",
  "release",
];

export class SchemaRegistry {
  private readonly schemas = new Map<string, SchemaDefinition>();

  register(definition: SchemaDefinition): void {
    if (!supportedEntities.includes(definition.name)) {
      throw new Error(`Unsupported canonical entity: ${definition.name}`);
    }
    const key = this.key(definition.name, definition.version);
    if (this.schemas.has(key)) {
      throw new Error(`Schema already registered: ${definition.name}@${definition.version}`);
    }
    this.schemas.set(key, definition);
  }

  latestVersion(name: CanonicalEntityName): string | undefined {
    const versions = Array.from(this.schemas.values())
      .filter((schema) => schema.name === name)
      .map((schema) => schema.version)
      .sort();
    return versions.at(-1);
  }

  validate(name: CanonicalEntityName, payload: unknown, version?: string): SchemaValidationResult {
    const targetVersion = version ?? this.latestVersion(name);
    if (!targetVersion) {
      return { valid: false, errors: [`No schema registered for ${name}`] };
    }
    const key = this.key(name, targetVersion);
    const definition = this.schemas.get(key);
    if (!definition) {
      return { valid: false, errors: [`Schema not found for ${name}@${targetVersion}`] };
    }
    if (!this.isObjectSchema(definition.schema)) {
      return { valid: false, errors: ["Schema must be an object schema"] };
    }
    return this.validateAgainstSchema(payload, definition.schema);
  }

  private validateAgainstSchema(payload: unknown, schema: ObjectSchema): SchemaValidationResult {
    if (typeof payload !== "object" || payload === null) {
      return { valid: false, errors: ["Payload must be an object"] };
    }
    const errors: string[] = [];
    const required = schema.required ?? [];
    for (const field of required) {
      if (!(field in (payload as Record<string, unknown>))) {
        errors.push(`Missing required field ${field}`);
      }
    }
    if (schema.properties) {
      for (const [field, rule] of Object.entries(schema.properties)) {
        const value = (payload as Record<string, unknown>)[field];
        if (value !== undefined && !this.matchesType(value, rule.type)) {
          errors.push(`Field ${field} expected ${rule.type}`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  private matchesType(value: unknown, type: PropertySchema["type"]): boolean {
    if (type === "object") return typeof value === "object" && value !== null;
    return typeof value === type;
  }

  private isObjectSchema(schema: Record<string, unknown>): schema is ObjectSchema {
    return schema.type === "object";
  }

  private key(name: CanonicalEntityName, version: string): string {
    return `${name}@${version}`;
  }
}
