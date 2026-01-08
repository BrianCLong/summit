import fs from "node:fs/promises";
import path from "node:path";

interface MigrationTemplate {
  extension: string;
  header: string;
  body?: string;
  folder: string;
}

const MIGRATION_TYPES: Record<string, MigrationTemplate> = {
  sql: {
    extension: ".sql",
    header: "-- SQL migration created by scripts/create-migration.ts",
    folder: path.join("migrations", "sql"),
  },
  graph: {
    extension: ".cypher",
    header: "// Graph migration created by scripts/create-migration.ts",
    folder: path.join("migrations", "graph"),
  },
  vector: {
    extension: ".sql",
    header: "-- Vector schema migration created by scripts/create-migration.ts",
    folder: path.join("migrations", "vector"),
    body: "-- Include DDL for vector indexes or embedding payload tables here.",
  },
  json: {
    extension: ".json",
    header: "",
    folder: path.join("migrations", "json"),
    body: JSON.stringify(
      {
        description: "Describe the JSON/document store migration here",
        createdBy: "scripts/create-migration.ts",
      },
      null,
      2
    ),
  },
};

function usage(): never {
  console.error(
    "Usage: node --loader ts-node/esm scripts/create-migration.ts <sql|graph|vector|json> <name>"
  );
  process.exit(1);
}

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .replace(/-{2,}/g, "-");
}

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function createMigration(type: string, name: string) {
  const template = MIGRATION_TYPES[type];

  if (!template) {
    console.error(`Unknown migration type: ${type}`);
    usage();
  }

  const safeName = sanitizeName(name);
  const fileName = `${timestamp()}_${safeName}${template.extension}`;
  const destinationDir = path.resolve(process.cwd(), template.folder);
  const destinationPath = path.join(destinationDir, fileName);

  await fs.mkdir(destinationDir, { recursive: true });

  const content = template.header
    ? `${template.header}\n\n${template.body ?? ""}`.trimEnd() + "\n"
    : `${template.body ?? ""}\n`;

  await fs.writeFile(destinationPath, content, "utf8");
  console.log(`Created ${type} migration: ${path.relative(process.cwd(), destinationPath)}`);
}

async function main() {
  const [, , type, ...rest] = process.argv;

  if (!type || rest.length === 0) {
    usage();
  }

  const name = rest.join("-");
  await createMigration(type, name);
}

main().catch((error) => {
  console.error("Failed to create migration file:", error);
  process.exitCode = 1;
});
