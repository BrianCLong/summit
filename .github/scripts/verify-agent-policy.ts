import { readFile } from 'node:fs/promises';
import path from 'node:path';

const run = async (): Promise<void> => {
  const policyPath = path.join(process.cwd(), '.github/policies/agent-policy.yaml');
  const policy = await readFile(policyPath, 'utf8');

  const requiredTokens = [
    'require-capabilities',
    'require-risk-level',
    'require-observability-score',
    'require-determinism-score',
    'deny-by-default',
  ];

  for (const token of requiredTokens) {
    if (!policy.includes(token)) {
      throw new Error(`Missing required policy token: ${token}`);
    }
  }

  console.log('agent policy check passed');
};

run().catch((error: unknown) => {
  console.error('agent policy check failed', error);
  process.exitCode = 1;
});
