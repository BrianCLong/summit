#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const out = {
    metrics: 'artifacts/graph-sync/metrics.json',
    output: 'artifacts/graph-sync/recon.json',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--metrics') {
      out.metrics = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--output') {
      out.output = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return out;
}

function summarize(metrics) {
  const gateA = metrics?.gates?.gateA;
  const gateB = metrics?.gates?.gateB;
  const gateC = metrics?.gates?.gateC;
  const gateD = metrics?.gates?.gateD;

  const findings = [];

  if (gateA && !gateA.pass) {
    for (const mapping of gateA.mappings ?? []) {
      if (mapping.pass) continue;
      findings.push(`PARITY ${mapping.table}/${mapping.label}: pg=${mapping.pgCount}, graph=${mapping.graphCount}, missing=${mapping.missingKeys.length}, extra=${mapping.extraKeys.length}`);
    }
  }

  if (gateB && !gateB.pass) {
    findings.push(`FK->EDGE mismatch: missing=${gateB.missingEdgeKeys?.length ?? 0}, duplicate=${gateB.duplicateEdgeKeys?.length ?? 0}, orphan=${gateB.orphanEdgeKeys?.length ?? 0}`);
  }

  if (gateC && !gateC.pass) {
    findings.push(`TX ALIGNMENT missing provenance=${gateC.missingProvenance?.length ?? 0}, missing lineage=${gateC.missingLineage?.length ?? 0}, max lineage lag=${gateC.maxLineageLagSeconds ?? 0}s`);
  }

  if (gateD && !gateD.pass) {
    findings.push(`FRESHNESS lag ${gateD.freshnessLagSeconds ?? 'n/a'}s exceeds SLO ${gateD.freshnessSloSeconds}s`);
  }

  const pass = Boolean(gateA?.pass && gateB?.pass && gateC?.pass && gateD?.pass);

  return {
    pass,
    gateA: gateA?.pass ?? false,
    gateB: gateB?.pass ?? false,
    gateC: gateC?.pass ?? false,
    gateD: gateD?.pass ?? false,
    findings,
    checkedAt: new Date().toISOString(),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const metricsRaw = await fs.readFile(args.metrics, 'utf8');
  const metrics = JSON.parse(metricsRaw);

  const report = summarize(metrics);

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, JSON.stringify(report, null, 2));

  if (report.pass) {
    console.log('Parity & Recon PASS');
    process.exit(0);
  }

  console.error('Parity & Recon FAIL');
  for (const finding of report.findings.slice(0, 20)) {
    console.error(` - ${finding}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error('Parity & Recon errored:', error);
  process.exit(1);
});
