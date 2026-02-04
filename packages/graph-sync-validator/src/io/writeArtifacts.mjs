import fs from "node:fs/promises";
export async function writeArtifacts({ outDir, metrics }) {
  await fs.mkdir(outDir, { recursive: true });
  const stamp = { tool:"graph-sync-validator", run_id: process.env.GITHUB_RUN_ID ?? null, ts: metrics.timestamp };
  const evidence = { acceptance: { idParity:"100%", refInt:"strict", maxLag:"0.1%" }, result: metrics };

  const stampPath   = `${outDir}/stamp.json`;
  const metricsPath = `${outDir}/metrics.json`;
  const evidencePath= `${outDir}/evidence.json`;

  await fs.writeFile(stampPath, JSON.stringify(stamp, null, 2));
  await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));
  await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  return { stampPath, metricsPath, evidencePath };
}
