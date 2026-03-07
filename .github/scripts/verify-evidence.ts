import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = ['index.json', 'report.json', 'metrics.json', 'stamp.json'];

const run = async (): Promise<void> => {
  const evidenceDir = path.join(root, 'evidence', 'agent-fleet-control-plane-2027');

  for (const file of requiredFiles) {
    const fullPath = path.join(evidenceDir, file);
    const content = await readFile(fullPath, 'utf8');
    JSON.parse(content);
  }

  console.log('evidence schema check passed');
};

run().catch((error: unknown) => {
  console.error('evidence schema check failed', error);
  process.exitCode = 1;
});
