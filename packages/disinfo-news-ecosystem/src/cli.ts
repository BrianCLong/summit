import fs from 'fs';
import path from 'path';
import { analyzeBundle } from './analyzer.js';
import { writeDeterministicJson, evidenceIdFromBytes } from './evidence.js';

async function main() {
  const args = process.argv.slice(2);
  let inputPath = '';
  let outDir = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input') {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === '--out') {
      outDir = args[i + 1];
      i++;
    }
  }

  if (!inputPath || !outDir) {
    console.error('Usage: --input <path> --out <dir>');
    process.exit(1);
  }

  const bundleContent = fs.readFileSync(inputPath, 'utf-8');
  const bundle = JSON.parse(bundleContent);

  const evidenceId = evidenceIdFromBytes(Buffer.from(bundleContent));
  const outputPrefix = path.join(outDir, evidenceId);
  fs.mkdirSync(outputPrefix, { recursive: true });

  const start = Date.now();
  const report = await analyzeBundle(bundle, evidenceId);
  const elapsed = Date.now() - start;

  writeDeterministicJson(path.join(outputPrefix, 'report.json'), report);

  const metrics = {
    elapsed_ms: elapsed,
    rss_mb_est: Math.round(process.memoryUsage().rss / 1024 / 1024),
    bundle_size_bytes: bundleContent.length,
    risk_score: report.risk_score,
    unknown_source_rate: report.signals.content.unknown_source_rate || 0
  };
  writeDeterministicJson(path.join(outputPrefix, 'metrics.json'), metrics);

  const stamp = {
    version: '1.0.0',
    content_hash: evidenceId.replace('EVD_', '')
  };
  writeDeterministicJson(path.join(outputPrefix, 'stamp.json'), stamp);

  console.log(`Analysis complete. Evidence: ${evidenceId}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
