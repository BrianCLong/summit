import { writeFileSync } from "node:fs";

export function generatePRWorkItem(workItemId: string, outputDir: string) {
  const diffPatch = "diff --git a/file b/file\n...";
  const metrics = { locDelta: 10, filesChanged: 1 };
  const stamp = { timestamp: new Date().toISOString() };
  const evidence = { id: `EID:AF:test-item:pr-gen:001` };

  writeFileSync(`${outputDir}/diff.patch`, diffPatch);
  writeFileSync(`${outputDir}/metrics.json`, JSON.stringify(metrics, null, 2));
  writeFileSync(`${outputDir}/stamp.json`, JSON.stringify(stamp, null, 2));
  writeFileSync(`${outputDir}/evidence.json`, JSON.stringify(evidence, null, 2));
}
