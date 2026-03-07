import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  generateNarrativeOperationalizationArtifacts,
  stableStringify,
  type NarrativeOperationalizationInput,
} from "../src/services/graphrag/narrative-operationalization-artifacts.js";

const fixturePath = process.argv[2];

if (!fixturePath) {
  throw new Error(
    "Usage: tsx server/scripts/narrative-operationalization-fixture.ts <fixture.json>"
  );
}

async function main(): Promise<void> {
  const fixture = await readFile(fixturePath, "utf8");
  const input = JSON.parse(fixture) as NarrativeOperationalizationInput;
  const artifacts = generateNarrativeOperationalizationArtifacts(input);

  const outputDir = path.resolve("artifacts/narrative-operationalization");
  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeFile(
      path.join(outputDir, "report.json"),
      `${stableStringify(artifacts.report)}\n`,
      "utf8"
    ),
    writeFile(
      path.join(outputDir, "metrics.json"),
      `${stableStringify(artifacts.metrics)}\n`,
      "utf8"
    ),
    writeFile(path.join(outputDir, "stamp.json"), `${stableStringify(artifacts.stamp)}\n`, "utf8"),
  ]);
}

main();
