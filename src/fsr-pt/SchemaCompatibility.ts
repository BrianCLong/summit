import { CompatibilityReport, JsonSchema, PropertyChange } from './types.js';

interface NormalizedProperty {
  type: string;
  required: boolean;
}

interface NormalizedSchema {
  properties: Map<string, NormalizedProperty>;
}

function toString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function normalizeSchema(schema: JsonSchema): NormalizedSchema {
  const propertiesNode = (schema?.properties ?? {}) as Record<string, JsonSchema>;
  const requiredList = new Set<string>(Array.isArray(schema?.required) ? (schema.required as string[]) : []);

  const normalized = new Map<string, NormalizedProperty>();
  for (const key of Object.keys(propertiesNode)) {
    const propertySchema = propertiesNode[key] as JsonSchema;
    const propertyType = typeof propertySchema?.type === 'string' ? (propertySchema.type as string) : 'unknown';

    normalized.set(key, {
      type: propertyType,
      required: requiredList.has(key),
    });
  }

  return { properties: normalized };
}

export function diffSchemas(previous: JsonSchema | null, next: JsonSchema): PropertyChange[] {
  const previousSchema = previous ? normalizeSchema(previous) : { properties: new Map() };
  const nextSchema = normalizeSchema(next);

  const propertyChanges: PropertyChange[] = [];
  const allPropertyNames = new Set<string>([
    ...previousSchema.properties.keys(),
    ...nextSchema.properties.keys(),
  ]);

  const sortedNames = Array.from(allPropertyNames.values()).sort();

  for (const name of sortedNames) {
    const before = previousSchema.properties.get(name);
    const after = nextSchema.properties.get(name);

    if (!before && after) {
      propertyChanges.push({
        property: name,
        current: after.type,
        changeType: after.required ? 'required-added' : 'added',
      });
      continue;
    }

    if (before && !after) {
      propertyChanges.push({
        property: name,
        previous: before.type,
        changeType: 'removed',
      });
      continue;
    }

    if (before && after) {
      if (before.type !== after.type) {
        propertyChanges.push({
          property: name,
          previous: before.type,
          current: after.type,
          changeType: 'type-changed',
        });
      }

      if (before.required !== after.required) {
        propertyChanges.push({
          property: name,
          previous: toString(before.required),
          current: toString(after.required),
          changeType: after.required ? 'required-added' : 'required-removed',
        });
      }
    }
  }

  return propertyChanges;
}

export function evaluateCompatibility(previous: JsonSchema | null, next: JsonSchema): CompatibilityReport {
  const propertyChanges = diffSchemas(previous, next);

  const breakingMessages: string[] = [];
  const nonBreakingMessages: string[] = [];

  for (const change of propertyChanges) {
    switch (change.changeType) {
      case 'removed':
        breakingMessages.push(`Property \"${change.property}\" was removed.`);
        break;
      case 'type-changed':
        breakingMessages.push(
          `Property \"${change.property}\" changed type from ${change.previous} to ${change.current}.`,
        );
        break;
      case 'required-added':
        breakingMessages.push(`Property \"${change.property}\" became required.`);
        break;
      case 'added':
        nonBreakingMessages.push(`Property \"${change.property}\" was added.`);
        break;
      case 'required-removed':
        nonBreakingMessages.push(`Property \"${change.property}\" is no longer required.`);
        break;
      default:
        break;
    }
  }

  breakingMessages.sort();
  nonBreakingMessages.sort();

  return {
    compatible: breakingMessages.length === 0,
    breakingChanges: breakingMessages,
    nonBreakingChanges: nonBreakingMessages,
  };
}
