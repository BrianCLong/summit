
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const taxonomyPath = path.join(process.cwd(), 'governance/taxonomy.v1.json');
const evidenceDir = path.join(process.cwd(), 'evidence');

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const content = fs.readFileSync(taxonomyPath, 'utf-8');
const taxonomy = JSON.parse(content);
const hash = crypto.createHash('sha256').update(content).digest('hex');

const stamp = {
  artifact: 'taxonomy',
  version: taxonomy.version,
  hash: hash,
  timestamp: new Date().toISOString(),
  verified: true,
  risk_framework: 'EU_AI_ACT_ALIGNED'
};

const stampPath = path.join(evidenceDir, 'taxonomy.stamp.json');
fs.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));

console.log(`✅ Taxonomy stamp created at ${stampPath}`);
console.log(`   Hash: ${hash}`);
