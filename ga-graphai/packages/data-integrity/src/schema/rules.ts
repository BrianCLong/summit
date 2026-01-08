import { existsSync } from "node:fs";
import { CompatibilityOptions, CompatibilityReport, SchemaDefinition } from "./types.js";

function buildIssues(oldDef: SchemaDefinition, newDef: SchemaDefinition) {
  const issues = [] as CompatibilityReport["issues"];
  const oldFields = oldDef.fields;
  const newFields = newDef.fields;
  for (const [name, meta] of Object.entries(oldFields)) {
    if (!newFields[name]) {
      issues.push({
        field: name,
        reason: "Field removed",
        severity: "breaking",
      });
      continue;
    }
    const candidate = newFields[name];
    if (candidate.type !== meta.type) {
      issues.push({
        field: name,
        reason: `Type changed from ${meta.type} to ${candidate.type}`,
        severity: "breaking",
      });
    }
    if (meta.required && !candidate.required) {
      issues.push({
        field: name,
        reason: "Field changed from required to optional",
        severity: "warning",
      });
    }
    if (!meta.required && candidate.required) {
      issues.push({
        field: name,
        reason: "Field changed from optional to required",
        severity: "breaking",
      });
    }
  }
  for (const [name, meta] of Object.entries(newFields)) {
    if (!oldFields[name]) {
      issues.push({
        field: name,
        reason: meta.required ? "New required field" : "New optional field",
        severity: meta.required ? "breaking" : "warning",
      });
    }
  }
  return issues;
}

export function compareSchemas(
  oldDef: SchemaDefinition,
  newDef: SchemaDefinition,
  options: CompatibilityOptions = {}
): CompatibilityReport {
  const issues = buildIssues(oldDef, newDef);
  const breakingIssues = issues.filter((issue) => issue.severity === "breaking");
  const allowBreaking = options.allowBreaking || process.env.BREAKING_CHANGE_APPROVED === "true";

  if (breakingIssues.length > 0 && allowBreaking) {
    const migrationDoc = options.migrationDocument ?? process.env.MIGRATION_DOC;
    if (!migrationDoc || !existsSync(migrationDoc)) {
      const issue = {
        field: "migration",
        reason: "BREAKING_CHANGE_APPROVED set but migration document missing",
        severity: "breaking",
      } as const;
      breakingIssues.push(issue);
      issues.push(issue);
    }
  }

  const compatible = breakingIssues.length === 0;
  return {
    schema: newDef.name,
    fromVersion: oldDef.version,
    toVersion: newDef.version,
    compatible,
    issues,
  };
}
