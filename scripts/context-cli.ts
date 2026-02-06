import { buildManifest } from '../packages/context/src/builder.mjs';
import { generateReport } from '../packages/context/src/report.mjs';
import fs from 'fs';

const command = process.argv[2];

if (command === 'build') {
  const manifest = buildManifest();
  console.log(JSON.stringify(manifest, null, 2));
} else if (command === 'report') {
  const requested = process.argv.slice(3);
  const report = generateReport(requested);
  console.log(JSON.stringify(report, null, 2));

  if (report.budget.status === 'exceeded') {
    console.error('Context Budget Exceeded!');
    process.exit(1);
  }
} else {
  console.log('Usage: npx tsx scripts/context-cli.ts [build|report]');
}
