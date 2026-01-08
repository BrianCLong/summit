
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

interface AcceptanceConfig {
  sector: string;
}

function parseArgs(): AcceptanceConfig {
  const args = process.argv.slice(2);
  const sectorIndex = args.indexOf('--sector');

  if (sectorIndex === -1) {
    console.error('Error: --sector argument is required');
    process.exit(1);
  }

  const sector = args[sectorIndex + 1];
  return { sector };
}

async function verifyTrustPack(bundleRoot: string) {
  const governanceDir = path.join(bundleRoot, 'governance');
  const files = await fs.readdir(governanceDir);
  const trustPack = files.find(f => f.startsWith('trust-pack_') && f.endsWith('.tar.gz'));
  if (!trustPack) throw new Error('Trust Pack not found');

  // Verify it's a valid tar (mock verification)
  try {
    await execAsync(`tar -tzf ${path.join(governanceDir, trustPack)}`);
  } catch (e) {
    throw new Error('Trust Pack is corrupt');
  }
}

async function verifySyntheticData(bundleRoot: string) {
  const dataPath = path.join(bundleRoot, 'demos', 'synthetic-data', 'data.json');
  try {
    const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
    if (!Array.isArray(data) || data.length === 0) throw new Error('Synthetic data is empty or invalid');
  } catch (e) {
    throw new Error('Synthetic data verification failed');
  }
}

async function main() {
  const { sector } = parseArgs();
  console.error(`Running acceptance tests for sector: ${sector}`);

  // Find the latest bundle for the sector
  const sectorDir = path.join(ROOT_DIR, 'dist', 'pilot-kit', sector);
  let ids;
  try {
    ids = await fs.readdir(sectorDir);
  } catch (e) {
    console.error(`No bundles found for sector ${sector}. Build one first.`);
    process.exit(1);
  }

  if (ids.length === 0) {
    console.error('No bundle ID directories found.');
    process.exit(1);
  }

  // Pick the most recently modified or just the first one for now.
  // In a real CI env we might pass the ID explicitly.
  const id = ids[0];
  const bundleRoot = path.join(sectorDir, id);
  console.error(`Testing bundle: ${id} at ${bundleRoot}`);

  const results: any = {
    checks: [],
    pass: true
  };

  const checks = [
    { name: 'Trust Pack Verification', fn: () => verifyTrustPack(bundleRoot) },
    { name: 'Synthetic Data Verification', fn: () => verifySyntheticData(bundleRoot) },
    { name: 'Index Schema Verification', fn: async () => {
        const index = JSON.parse(await fs.readFile(path.join(bundleRoot, 'index.json'), 'utf-8'));
        if (!index.id || !index.sector) throw new Error('Index schema invalid');
      }
    }
  ];

  for (const check of checks) {
    try {
      await check.fn();
      results.checks.push({ name: check.name, status: 'PASS' });
    } catch (e: any) {
      results.checks.push({ name: check.name, status: 'FAIL', error: e.message });
      results.pass = false;
    }
  }

  // Emit results
  const resultsDir = path.join(bundleRoot, 'acceptance', 'results');
  await fs.mkdir(resultsDir, { recursive: true });

  await fs.writeFile(path.join(resultsDir, 'acceptance-summary.json'), JSON.stringify(results, null, 2));

  const mdReport = `# Acceptance Summary
**Sector:** ${sector}
**ID:** ${id}
**Result:** ${results.pass ? 'PASS' : 'FAIL'}

## Checks
${results.checks.map((c: any) => `- **${c.name}**: ${c.status} ${c.error ? `(${c.error})` : ''}`).join('\n')}
`;
  await fs.writeFile(path.join(resultsDir, 'acceptance-summary.md'), mdReport);

  console.log(JSON.stringify(results, null, 2));

  if (!results.pass) process.exit(1);
}

main().catch(err => {
  console.error('Acceptance test runner failed:', err);
  process.exit(1);
});
