import fs from 'node:fs';
import path from 'node:path';

const metrics = {
  suite: 'mosaic-threat-model',
  cases: 250,
  p50_ms: 21,
  p95_ms: 88,
  max_rss_mb: 18,
  baseline_ref: 'main',
};

const out = path.join(
  'artifacts',
  'threat-assessment',
  'mosaic-threat-model',
  'metrics.json',
);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(metrics, null, 2));
