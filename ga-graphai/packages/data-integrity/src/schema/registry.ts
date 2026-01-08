import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { CompatibilityReport, SchemaDefinition } from "./types.js";
import { compareSchemas } from "./rules.js";

function sortVersion(a: string, b: string): number {
  const normalize = (value: string) => value.replace(/^v/, "");
  return Number.parseInt(normalize(a), 10) - Number.parseInt(normalize(b), 10);
}

export class SchemaRegistry {
  private definitions = new Map<string, Map<string, SchemaDefinition>>();

  register(definition: SchemaDefinition): void {
    if (!this.definitions.has(definition.name)) {
      this.definitions.set(definition.name, new Map());
    }
    this.definitions.get(definition.name)!.set(definition.version, definition);
  }

  get(schema: string, version: string): SchemaDefinition | undefined {
    return this.definitions.get(schema)?.get(version);
  }

  list(schema: string): SchemaDefinition[] {
    return Array.from(this.definitions.get(schema)?.values() ?? []).sort((a, b) =>
      sortVersion(a.version, b.version)
    );
  }

  schemas(): string[] {
    return Array.from(this.definitions.keys()).sort();
  }

  latest(schema: string): SchemaDefinition | undefined {
    const versions = this.list(schema);
    return versions.at(-1);
  }

  previous(schema: string): SchemaDefinition | undefined {
    const versions = this.list(schema);
    return versions.length > 1 ? versions[versions.length - 2] : undefined;
  }

  checkLatest(): CompatibilityReport[] {
    const reports: CompatibilityReport[] = [];
    for (const schema of this.schemas()) {
      const current = this.latest(schema);
      const prior = this.previous(schema);
      if (current && prior) {
        reports.push(compareSchemas(prior, current));
      }
    }
    return reports;
  }

  static async fromDirectory(schemaDir: string): Promise<SchemaRegistry> {
    const fs = await import("node:fs/promises");
    const entries = await fs.readdir(schemaDir);
    const registry = new SchemaRegistry();
    for (const entry of entries) {
      if (extname(entry) !== ".json") {
        continue;
      }
      const contents = await readFile(join(schemaDir, entry), "utf8");
      const definition = JSON.parse(contents) as SchemaDefinition;
      if (!definition.name || !definition.version || !definition.fields) {
        throw new Error(`Invalid schema definition in ${entry}`);
      }
      registry.register(definition);
    }
    return registry;
  }

  static fromDefinitions(definitions: SchemaDefinition[]): SchemaRegistry {
    const registry = new SchemaRegistry();
    definitions.forEach((definition) => registry.register(definition));
    return registry;
  }
}

export function versionFromFilename(filename: string): string {
  const base = basename(filename, extname(filename));
  const parts = base.split(".");
  return parts.at(-1) ?? base;
}
