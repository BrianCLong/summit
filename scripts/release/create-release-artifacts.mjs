import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const distDir = path.resolve('dist/release');
const channelPath = path.join(distDir, 'channel.json');

if (!fs.existsSync(channelPath)) {
  console.error('Error: dist/release/channel.json not found. Run classify-tag.mjs first.');
  process.exit(1);
}

const channelInfo = JSON.parse(fs.readFileSync(channelPath, 'utf8'));

// 1. Create release-manifest.json
const manifest = {
  ...channelInfo,
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(path.join(distDir, 'release-manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Created release-manifest.json');

// 2. Update provenance.json if present (in dist/release)
// The user prompt said: "provenance.json (if present) includes channel"
// This implies it might be there.
const provenancePath = path.join(distDir, 'provenance.json');
if (fs.existsSync(provenancePath)) {
  try {
    const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
    provenance.channel = channelInfo.channel;
    fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2));
    console.log('Updated provenance.json with channel info');
  } catch (e) {
    console.warn('Warning: Failed to parse/update provenance.json', e.message);
  }
}

// 3. Generate SHA256SUMS
// We only hash files in dist/release (excluding SHA256SUMS itself)
const files = fs.readdirSync(distDir).filter(f => f !== 'SHA256SUMS');
const sha256sums = [];

for (const file of files) {
  const filePath = path.join(distDir, file);
  if (fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    sha256sums.push(`${hash}  ${file}`);
  }
}

fs.writeFileSync(path.join(distDir, 'SHA256SUMS'), sha256sums.join('\n') + '\n');
console.log('Created SHA256SUMS');
