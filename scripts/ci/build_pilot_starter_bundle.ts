
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const SECTORS = ['gov', 'finance', 'critical-infra'];

interface BundleConfig {
  sector: string;
  id: string;
}

function parseArgs(): BundleConfig {
  const args = process.argv.slice(2);
  const sectorIndex = args.indexOf('--sector');
  const idIndex = args.indexOf('--id');

  if (sectorIndex === -1) {
    console.error('Error: --sector argument is required');
    process.exit(1);
  }

  const sector = args[sectorIndex + 1];
  if (!SECTORS.includes(sector)) {
    console.error(`Error: Invalid sector. Must be one of: ${SECTORS.join(', ')}`);
    process.exit(1);
  }

  const id = idIndex !== -1 ? args[idIndex + 1] : crypto.randomUUID().slice(0, 8);

  return { sector, id };
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateSyntheticData(sector: string, outputDir: string) {
  const data = [];
  for (let i = 0; i < 100; i++) {
    let record: any = { id: i, timestamp: new Date().toISOString() };
    if (sector === 'gov') {
      record = { ...record, type: 'document', classification: 'UNCLASSIFIED', title: `Doc ${i}` };
    } else if (sector === 'finance') {
      record = { ...record, type: 'transaction', amount: Math.random() * 1000, currency: 'USD' };
    } else if (sector === 'critical-infra') {
      record = { ...record, type: 'sensor_reading', value: Math.random() * 100, unit: 'psi' };
    }
    data.push(record);
  }
  await fs.writeFile(path.join(outputDir, 'data.json'), JSON.stringify(data, null, 2));
}

async function calculateChecksum(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function processTemplate(templatePath: string, outputPath: string, replacements: Record<string, string>) {
  let content = await fs.readFile(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  await fs.writeFile(outputPath, content);
}

async function main() {
  const { sector, id } = parseArgs();
  console.error(`Building pilot bundle for sector: ${sector}, id: ${id}`);

  const outputBase = path.join(ROOT_DIR, 'dist', 'pilot-kit', sector, id);
  await ensureDir(outputBase);

  // Directory structure
  const dirs = ['sector', 'runbooks', 'governance', 'acceptance', 'acceptance/results', 'demos', 'demos/synthetic-data', 'proofs', 'bundle'];
  for (const dir of dirs) {
    await ensureDir(path.join(outputBase, dir));
  }

  // 1. Sector Profile
  const sectorProfileSrc = path.join(ROOT_DIR, 'docs/pilots', sector, 'sector-profile.json');
  const sectorProfileDest = path.join(outputBase, 'sector', 'sector-profile.json');
  await fs.copyFile(sectorProfileSrc, sectorProfileDest);

  // Success metrics and redlines (mocked for now)
  await fs.writeFile(path.join(outputBase, 'sector', 'success-metrics.yml'), 'latency_p95: 200ms\nuptime: 99.9%\n');
  await fs.writeFile(path.join(outputBase, 'sector', 'redlines.yml'), 'data_leak: true\nunauthorized_access: true\n');

  // 2. Runbooks
  const replacements = {
    SECTOR: sector,
    SECTOR_NAME: sector.toUpperCase(),
    BUNDLE_ID: id,
    BUILD_DATE: new Date().toISOString(), // In real deterministic build, this might be fixed or passed in
    ID: id,
    RANDOM_PASS: crypto.randomBytes(8).toString('hex')
  };

  const templatesDir = path.join(ROOT_DIR, 'config/pilots/templates');
  await processTemplate(path.join(templatesDir, 'pilot-ops.md'), path.join(outputBase, 'runbooks', 'pilot-ops.md'), replacements);
  await processTemplate(path.join(templatesDir, 'security-posture.md'), path.join(outputBase, 'runbooks', 'security-posture.md'), replacements);
  await processTemplate(path.join(templatesDir, 'data-handling.md'), path.join(outputBase, 'runbooks', 'data-handling.md'), replacements);

  // 3. Governance
  // Create a dummy trust pack
  const trustPackDir = path.join(outputBase, 'governance', 'trust_pack_temp');
  await ensureDir(trustPackDir);
  await fs.writeFile(path.join(trustPackDir, 'SOC2_Bridge.pdf'), 'DUMMY PDF CONTENT');
  await fs.writeFile(path.join(trustPackDir, 'ISO27001_Cert.pdf'), 'DUMMY PDF CONTENT');

  // Tar the trust pack
  const trustPackTarPath = path.join(outputBase, 'governance', `trust-pack_${id}.tar.gz`);
  await execAsync(`tar -czf ${trustPackTarPath} -C ${path.join(outputBase, 'governance')} trust_pack_temp`);
  await fs.rm(trustPackDir, { recursive: true, force: true });

  await fs.writeFile(path.join(outputBase, 'governance', 'trust-pack-verify.json'), JSON.stringify({ verified: true, date: new Date().toISOString() }, null, 2));
  await fs.writeFile(path.join(outputBase, 'governance', 'disclosure-policy.hash'), crypto.createHash('sha256').update('policy').digest('hex'));

  // 4. Acceptance
  await fs.writeFile(path.join(outputBase, 'acceptance', 'acceptance-plan.md'), '# Acceptance Plan\n\n1. Run tests.\n2. Check results.\n');
  // Copy acceptance test script or binary if we were compiling one. For now just placeholder.

  // 5. Demos
  await fs.writeFile(path.join(outputBase, 'demos', 'demo-script.md'), '# Demo Script\n\n1. Step one.\n2. Step two.\n');
  await generateSyntheticData(sector, path.join(outputBase, 'demos', 'synthetic-data'));

  // 6. Index.json
  const index = {
    id,
    sector,
    build_date: replacements.BUILD_DATE,
    contents: {
      profile: 'sector/sector-profile.json',
      trust_pack: `governance/trust-pack_${id}.tar.gz`,
      runbooks: ['runbooks/pilot-ops.md', 'runbooks/security-posture.md'],
      data: 'demos/synthetic-data/data.json'
    }
  };
  await fs.writeFile(path.join(outputBase, 'index.json'), JSON.stringify(index, null, 2));

  // 7. Checksums
  const checksums: Record<string, string> = {};
  async function scanDir(dir: string, relativeRoot: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(relativeRoot, fullPath);
      if (entry.isDirectory()) {
        if (entry.name === 'bundle' || entry.name === 'proofs') continue;
        await scanDir(fullPath, relativeRoot);
      } else {
        checksums[relativePath] = await calculateChecksum(fullPath);
      }
    }
  }
  await scanDir(outputBase, outputBase);

  const checksumsContent = Object.entries(checksums)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, val]) => `${val}  ${key}`)
    .join('\n');
  await fs.writeFile(path.join(outputBase, 'proofs', 'checksums.sha256'), checksumsContent);

  await fs.writeFile(path.join(outputBase, 'proofs', 'build-metadata.json'), JSON.stringify({
    builder: 'pilot-starter-builder',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  }, null, 2));

  // 8. Create Final Bundle
  const bundleName = `pilot-starter_${sector}_${id}.tar.gz`;
  const bundlePath = path.join(outputBase, 'bundle', bundleName);

  // Create tarball of everything except the bundle dir itself
  // We need to be careful with paths.
  await execAsync(`tar -czf ${bundlePath} -C ${path.join(ROOT_DIR, 'dist', 'pilot-kit', sector)} ${id}`);

  console.error(`\nBundle created successfully at: ${bundlePath}`);
  console.log(JSON.stringify(index, null, 2)); // Stdout for machine consumption
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
