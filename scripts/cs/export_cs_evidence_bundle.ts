
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function calculateChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function main() {
  const [tenantId, qbrDate] = process.argv.slice(2);

  if (!tenantId || !qbrDate) {
    console.error(`Usage: ts-node export_cs_evidence_bundle.ts <tenant-id> <qbr-date>`);
    process.exit(1);
  }

  const sourceDir = `artifacts/cs/${tenantId}/${qbrDate}`;
  const outputDir = `artifacts/cs-bundles/${tenantId}/${qbrDate}`;

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source artifacts for ${tenantId} on ${qbrDate} not found.`);
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const filesToBundle = [
    'trust-dashboard.md',
    'trust-dashboard.json',
  ];

  const manifest = {
    tenantId,
    qbrDate,
    files: [] as { name: string; checksum: string }[],
  };

  for (const file of filesToBundle) {
    const sourcePath = path.join(sourceDir, file);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(outputDir, file);
      fs.copyFileSync(sourcePath, destPath);
      const checksum = calculateChecksum(destPath);
      manifest.files.push({ name: file, checksum });
    }
  }

  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outputDir, 'checksums.json'), JSON.stringify(manifest.files, null, 2));
  fs.writeFileSync(path.join(outputDir, 'stamp.json'), JSON.stringify({ timestamp: new Date().toISOString() }, null, 2));

  console.log(`CS evidence bundle for ${tenantId} on ${qbrDate} created.`);
  console.log(`Output written to ${outputDir}`);
}

main();
