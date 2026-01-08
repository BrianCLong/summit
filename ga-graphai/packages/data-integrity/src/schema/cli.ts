import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SchemaRegistry } from "./registry.js";

async function main() {
  const baseDir = dirname(fileURLToPath(import.meta.url));
  const defaultDir = join(baseDir, "..", "..", "schema");
  const schemaDir = process.env.SCHEMA_DIR ?? defaultDir;
  const registry = await SchemaRegistry.fromDirectory(schemaDir);
  const reports = registry.checkLatest();
  let exitCode = 0;
  for (const report of reports) {
    const breaking = report.issues.filter((issue) => issue.severity === "breaking");
    if (breaking.length > 0) {
      exitCode = 1;
      console.error(
        `Schema ${report.schema} incompatible from ${report.fromVersion} -> ${report.toVersion}:`
      );
      breaking.forEach((issue) => console.error(` - ${issue.field}: ${issue.reason}`));
    }
  }
  if (exitCode === 0) {
    console.log("Schema compatibility check passed");
  }
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
