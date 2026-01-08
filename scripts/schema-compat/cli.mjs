import fs from "node:fs/promises";
import path from "node:path";
import { compareDirectories } from "./compare.mjs";
import { buildReport } from "./report.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith("--")) {
      args[key.replace(/^--/, "")] = argv[i + 1];
      i += 1;
    }
  }

  if (!args.baseline || !args.current) {
    throw new Error(
      "Usage: node scripts/schema-compat/cli.mjs --baseline <path> --current <path> [--report <file>] [--compat <file>]"
    );
  }

  return {
    baselineDir: path.resolve(args.baseline),
    currentDir: path.resolve(args.current),
    reportPath: path.resolve(args.report ?? "schema-compat-report.md"),
    compatPath: args.compat ? path.resolve(args.compat) : undefined,
  };
}

async function loadCompatibilityMap(filePath) {
  if (!filePath) return undefined;
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load compatibility map at ${filePath}: ${error?.message}`);
  }
}

export async function run(argv) {
  const args = parseArgs(argv);
  const compatibility = await loadCompatibilityMap(args.compatPath);
  const diff = await compareDirectories({
    baselineDir: args.baselineDir,
    currentDir: args.currentDir,
    compatibility,
  });
  const report = buildReport(diff, args.baselineDir, args.currentDir);
  await fs.writeFile(args.reportPath, report, "utf8");
  const unresolvedBreaking = diff.unresolved.length;

  if (unresolvedBreaking) {
    console.error(`Schema compatibility check failed. See report at ${args.reportPath}`);
    process.exitCode = 1;
  } else {
    console.log(`Schema compatibility check passed. Report written to ${args.reportPath}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
