import { ContractSpec, ConformanceResult, ContractField } from './types.js';

export function normalizeSpec(spec: ContractSpec): string {
  const sortedFields = [...spec.fields].sort((a, b) => a.name.localeCompare(b.name));
  const normalized: ContractSpec = {
    ...spec,
    fields: sortedFields,
  };
  return JSON.stringify(normalized);
}

function validateType(field: ContractField, value: unknown): boolean {
  if (field.type === 'array') return Array.isArray(value);
  if (field.type === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value);
  return typeof value === field.type;
}

export function validateConformance(
  spec: ContractSpec,
  payload: Record<string, unknown>,
): ConformanceResult {
  const missingFields: string[] = [];
  const nullabilityViolations: string[] = [];
  const typeViolations: string[] = [];

  spec.fields.forEach((field) => {
    if (!(field.name in payload)) {
      missingFields.push(field.name);
      return;
    }
    const value = payload[field.name];
    if (value === null || value === undefined) {
      if (!field.nullable) {
        nullabilityViolations.push(field.name);
      }
      return;
    }
    if (!validateType(field, value)) {
      typeViolations.push(field.name);
    }
  });

  const totalChecks = spec.fields.length * 2;
  const passedChecks = totalChecks - missingFields.length - nullabilityViolations.length - typeViolations.length;
  const score = Math.max(0, Math.round((passedChecks / totalChecks) * 100));

  return {
    conforms: missingFields.length === 0 && nullabilityViolations.length === 0 && typeViolations.length === 0,
    missingFields,
    nullabilityViolations,
    typeViolations,
    score,
    piiFlagsValid: spec.fields.every((field) => field.pii !== undefined),
    dpFlagsValid: spec.fields.every((field) => field.dp !== undefined),
  };
}

export function diffSpecs(previous: ContractSpec, current: ContractSpec): string[] {
  const diffs: string[] = [];
  const previousMap = new Map(previous.fields.map((field) => [field.name, field]));
  const currentMap = new Map(current.fields.map((field) => [field.name, field]));

  previousMap.forEach((field, name) => {
    if (!currentMap.has(name)) {
      diffs.push(`Field ${name} removed`);
      return;
    }
    const updated = currentMap.get(name)!;
    if (field.type !== updated.type) diffs.push(`Field ${name} type changed: ${field.type} -> ${updated.type}`);
    if (field.nullable !== updated.nullable)
      diffs.push(`Field ${name} nullability changed: ${field.nullable} -> ${updated.nullable}`);
    if (field.unit !== updated.unit) diffs.push(`Field ${name} unit changed: ${field.unit} -> ${updated.unit}`);
  });

  currentMap.forEach((field, name) => {
    if (!previousMap.has(name)) {
      diffs.push(`Field ${name} added`);
    }
  });

  if (previous.license !== current.license) {
    diffs.push(`License changed: ${previous.license} -> ${current.license}`);
  }

  return diffs;
}
