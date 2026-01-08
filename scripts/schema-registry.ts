import fs from "node:fs/promises";
import path from "node:path";

export interface SchemaRegistry {
  name: string;
  description?: string;
  schemaGlobs: string[];
  migrationGlobs: string[];
}

export const REGISTRY_FILES = [
  path.resolve(process.cwd(), "migrations/sql/registry.json"),
  path.resolve(process.cwd(), "migrations/graph/registry.json"),
  path.resolve(process.cwd(), "migrations/vector/registry.json"),
  path.resolve(process.cwd(), "migrations/json/registry.json"),
];

export const DEFAULT_IGNORES = [
  "**/node_modules/**",
  "**/.turbo/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.git/**",
];

async function readRegistry(filePath: string): Promise<SchemaRegistry> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<SchemaRegistry>;

  if (!parsed.name) {
    parsed.name = path.basename(path.dirname(filePath));
  }

  if (!parsed.schemaGlobs || !parsed.migrationGlobs) {
    throw new Error(`Registry ${filePath} must define schemaGlobs and migrationGlobs`);
  }

  return {
    name: parsed.name,
    description: parsed.description ?? "",
    schemaGlobs: parsed.schemaGlobs,
    migrationGlobs: parsed.migrationGlobs,
  };
}

export async function loadSchemaRegistries(): Promise<SchemaRegistry[]> {
  const registries: SchemaRegistry[] = [];

  for (const filePath of REGISTRY_FILES) {
    try {
      const registry = await readRegistry(filePath);
      registries.push(registry);
    } catch (error) {
      throw new Error(`Unable to read schema registry at ${filePath}: ${String(error)}`);
    }
  }

  return registries;
}
