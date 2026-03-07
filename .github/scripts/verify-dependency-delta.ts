import { readFile } from 'node:fs/promises';
import path from 'node:path';

const run = async (): Promise<void> => {
  const docPath = path.join(process.cwd(), 'docs/security/dependency-delta-agent-control-plane.md');
  const content = await readFile(docPath, 'utf8');

  if (!content.includes('No runtime dependencies were added')) {
    throw new Error('Dependency delta document must state runtime dependency status.');
  }

  console.log('dependency delta check passed');
};

run().catch((error: unknown) => {
  console.error('dependency delta check failed', error);
  process.exitCode = 1;
});
