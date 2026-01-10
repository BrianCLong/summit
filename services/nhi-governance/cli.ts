import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exampleGraph, InventoryGraph } from './models.js';
import { scanRepositoryForSecrets, applyRepoFindings } from './discovery/repoScanner.js';
import { fetchMockCloudInventory } from './discovery/mockCloudAdapter.js';
import { evaluatePolicies } from './policies/policyEngine.js';

const parseArgs = (argv: string[]): Map<string, string> => {
  const args = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    if (!key) continue;
    args.set(key, value ?? 'true');
  }
  return args;
};

const mergeGraphs = (a: InventoryGraph, b: InventoryGraph): InventoryGraph => ({
  nhis: [...a.nhis, ...b.nhis],
  credentials: [...a.credentials, ...b.credentials],
  cryptoAssets: [...a.cryptoAssets, ...b.cryptoAssets],
});

const writeJson = async (filePath: string, data: unknown) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

const createAuditLog = async (message: string) => {
  const logPath = path.join('tmp', 'nhi-audit.log');
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const entry = `${new Date().toISOString()} ${message}\n`;
  await fs.appendFile(logPath, entry);
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const scanRoot = path.resolve(args.get('root') ?? process.env.NHI_SCAN_ROOT ?? process.cwd());
  const maxTtlDays = Number(args.get('max-ttl-days') ?? process.env.NHI_MAX_TTL_DAYS ?? 90);
  const baseGraph = exampleGraph();
  const cloudGraph = fetchMockCloudInventory({ provider: 'mock', projectId: 'demo', accountId: '000111222' });
  const mergedGraph = mergeGraphs(baseGraph, cloudGraph);

  const repoFindings = await scanRepositoryForSecrets(scanRoot);
  const withRepoFindings = applyRepoFindings(mergedGraph, repoFindings);

  const inventoryPath = path.join('tmp', 'nhi-inventory.json');
  await writeJson(inventoryPath, withRepoFindings);

  const report = evaluatePolicies(withRepoFindings, maxTtlDays);
  const reportPath = path.join('tmp', 'nhi-policy-report.json');
  await writeJson(reportPath, report);

  await createAuditLog(
    `nhi:discover root=${scanRoot} inventory=${withRepoFindings.nhis.length} identities, ${withRepoFindings.credentials.length} credentials, ${withRepoFindings.cryptoAssets.length} crypto assets; violations=${report.violations.length}`,
  );

  console.log('NHI inventory written to', inventoryPath);
  console.log('Policy report written to', reportPath);
  console.table(report.summary);

  if (report.summary.high) {
    console.error('High severity violations detected.');
    process.exitCode = 1;
  }
};

run().catch(async (error) => {
  console.error('nhi:discover failed', error);
  await createAuditLog(`nhi:discover failed: ${error.message}`);
  process.exitCode = 1;
});
