export interface SchemaField {
  type: string;
  required?: boolean;
}

export interface SchemaDefinition {
  name: string;
  version: string;
  fields: Record<string, SchemaField>;
}

export interface CompatibilityIssue {
  field: string;
  reason: string;
  severity: "breaking" | "warning";
}

export interface CompatibilityReport {
  schema: string;
  fromVersion: string;
  toVersion: string;
  compatible: boolean;
  issues: CompatibilityIssue[];
}

export interface CompatibilityOptions {
  allowBreaking?: boolean;
  migrationDocument?: string;
}
