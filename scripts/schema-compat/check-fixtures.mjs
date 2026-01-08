import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareDirectories } from "./compare.mjs";
import { buildReport } from "./report.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const expectedRoot = path.join(root, "expected");

async function validateScenario(name, expectUnresolved) {
  const baseline = path.join(root, "baseline");
  const current = path.join(root, name);
  const diff = await compareDirectories({ baselineDir: baseline, currentDir: current });
  const report = buildReport(diff, baseline, current);
  const expected = await fs.readFile(path.join(expectedRoot, `${name}.md`), "utf8");
  if (report !== expected) {
    throw new Error(`Report mismatch for ${name}`);
  }
  if (expectUnresolved && diff.unresolved.length === 0) {
    throw new Error(`Expected unresolved breaking changes for ${name}`);
  }
  if (!expectUnresolved && diff.unresolved.length > 0) {
    throw new Error(`Expected compatibility for ${name} but found breaking changes`);
  }
}

async function main() {
  await validateScenario("additive", false);
  await validateScenario("breaking", true);
  console.log("Fixture compatibility assertions succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
