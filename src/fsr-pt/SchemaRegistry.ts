import { diffSchemas, evaluateCompatibility } from './SchemaCompatibility.js';
import { diffPolicyTags } from './TagDiff.js';
import {
  CompatibilityReport,
  JsonSchema,
  PolicyTags,
  RegistrationResult,
  SchemaDiffReport,
  SchemaHistoryEntry,
  SchemaMetadata,
} from './types.js';
import { generatePythonClient, generateTypescriptClient } from './clientGenerator.js';

function cloneSchema(schema: JsonSchema): JsonSchema {
  return JSON.parse(JSON.stringify(schema));
}

export class SchemaRegistry {
  private store: Map<string, Map<string, SchemaHistoryEntry[]>> = new Map();

  registerSchema(
    silo: string,
    name: string,
    version: string,
    schema: JsonSchema,
    policyTags: PolicyTags,
  ): RegistrationResult {
    const siloBucket = this.ensureSiloBucket(silo);
    const history = siloBucket.get(name) ?? [];

    if (history.some((entry) => entry.version === version)) {
      throw new Error(`Schema ${silo}/${name}@${version} already registered.`);
    }

    const previous = history.at(-1) ?? null;
    const compatibility = this.computeCompatibility(previous, schema);
    const propertyChanges = diffSchemas(previous?.schema ?? null, schema);
    const tagDiff = diffPolicyTags(previous?.policyTags ?? null, policyTags);

    const metadata: SchemaMetadata = {
      silo,
      name,
      version,
      policyTags: { ...policyTags },
      schema: cloneSchema(schema),
      registeredAt: new Date(),
    };

    const diff: SchemaDiffReport = {
      propertyChanges,
      tagDiff,
      impactSummary: this.buildImpactSummary(compatibility, tagDiff),
    };

    history.push(metadata);
    siloBucket.set(name, history);

    return {
      metadata,
      compatibility,
      diff,
      isBreakingChange: !compatibility.compatible,
    };
  }

  getLatestSchema(silo: string, name: string): SchemaHistoryEntry | null {
    const history = this.store.get(silo)?.get(name) ?? null;
    return history && history.length > 0 ? history.at(-1)! : null;
  }

  getSchemaVersion(silo: string, name: string, version: string): SchemaHistoryEntry | null {
    const history = this.store.get(silo)?.get(name);
    if (!history) {
      return null;
    }

    return history.find((entry) => entry.version === version) ?? null;
  }

  listSilos(): string[] {
    return Array.from(this.store.keys()).sort();
  }

  listSchemas(silo: string): string[] {
    const bucket = this.store.get(silo);
    if (!bucket) {
      return [];
    }

    return Array.from(bucket.keys()).sort();
  }

  generateClientBindings(
    silo: string,
    name: string,
    version?: string,
  ): { typescript: string; python: string } {
    const schema = version
      ? this.getSchemaVersion(silo, name, version)
      : this.getLatestSchema(silo, name);

    if (!schema) {
      throw new Error(`Schema ${silo}/${name}${version ? `@${version}` : ''} not found.`);
    }

    return {
      typescript: generateTypescriptClient(schema),
      python: generatePythonClient(schema),
    };
  }

  private ensureSiloBucket(silo: string): Map<string, SchemaHistoryEntry[]> {
    if (!this.store.has(silo)) {
      this.store.set(silo, new Map());
    }

    return this.store.get(silo)!;
  }

  private computeCompatibility(previous: SchemaHistoryEntry | null, schema: JsonSchema): CompatibilityReport {
    return evaluateCompatibility(previous?.schema ?? null, schema);
  }

  private buildImpactSummary(
    compatibility: CompatibilityReport,
    tagDiff: SchemaDiffReport['tagDiff'],
  ): string[] {
    const lines: string[] = [];

    for (const message of compatibility.breakingChanges) {
      lines.push(`BREAKING: ${message}`);
    }

    for (const message of compatibility.nonBreakingChanges) {
      lines.push(`INFO: ${message}`);
    }

    if (tagDiff.summary) {
      const tagLines = tagDiff.summary.split('\n').map((entry) => entry.trim());
      for (const tagLine of tagLines) {
        if (tagLine.length > 0) {
          lines.push(`TAG: ${tagLine}`);
        }
      }
    }

    return lines;
  }
}
