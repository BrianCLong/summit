import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const HOOKS_DIR = '.summit/hooks';

export async function runHook(hookName: string): Promise<string> {
  if (process.env.ENABLE_CONTEXT_HOOKS !== 'true') {
    throw new Error('Context Hooks are disabled. Set ENABLE_CONTEXT_HOOKS=true to enable.');
  }

  // Validate hook name (strict allowlist of chars to prevent traversal)
  if (!/^[a-zA-Z0-9_-]+$/.test(hookName)) {
    throw new Error('Invalid hook name.');
  }

  const hookPath = path.join(HOOKS_DIR, `${hookName}.sh`); // Assume bash for now
  if (!fs.existsSync(hookPath)) {
    throw new Error(`Hook ${hookName} not found.`);
  }

  return new Promise((resolve, reject) => {
    exec(`bash ${hookPath}`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Hook failed: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}
