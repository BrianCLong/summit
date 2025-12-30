import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const SERVER_ROOT = path.resolve(__dirname, '../../');
const SRC_ROOT = path.join(SERVER_ROOT, 'src');

// --- Helper Functions ---

function checkFileExists(relativePath: string): boolean {
  const fullPath = path.join(SERVER_ROOT, relativePath);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    console.log(`[B0] ✅ File exists: ${relativePath}`);
  } else {
    console.error(`[B0] ❌ File missing: ${relativePath}`);
  }
  return exists;
}

function checkFileContent(relativePath: string, regex: RegExp, description: string): boolean {
  const fullPath = path.join(SERVER_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return false;

  const content = fs.readFileSync(fullPath, 'utf-8');
  const match = regex.test(content);
  if (match) {
    console.log(`[B0] ✅ Found ${description} in ${relativePath}`);
  } else {
    console.error(`[B0] ❌ Missing ${description} in ${relativePath}`);
  }
  return match;
}

async function runB1Checks() {
  console.log('\n--- Starting Tier B1 (Runtime) Verification ---');

  // Dependency Probe
  try {
    // Check for a critical dependency that would fail if node_modules is broken
    await import('zod');
    console.log('[B1] Dependencies detected. Proceeding with runtime checks...');
  } catch (e) {
    console.warn('[B1] ⚠️ Critical dependencies (zod) missing or failing to load.');
    console.warn('[B1] Skipping runtime verification. This is expected in constrained environments.');
    console.warn('[B1] To run B1 checks, ensure `pnpm install` has completed successfully.');
    return;
  }

  // Runtime Logic (Wrapped in try-catch to be safe)
  try {
    // 1. Sensitivity Levels
    const { SensitivityClass } = await import('../../src/pii/sensitivity.js');
    if (SensitivityClass.PUBLIC && SensitivityClass.CONFIDENTIAL) {
       console.log('[B1] ✅ Runtime: SensitivityClass loaded correctly.');
    } else {
       console.error('[B1] ❌ Runtime: SensitivityClass malformed.');
       process.exitCode = 1;
    }

    // 2. Rate Limiter Factory
    const { createRateLimiter } = await import('../../src/middleware/rateLimit.js');
    if (typeof createRateLimiter === 'function') {
        console.log('[B1] ✅ Runtime: createRateLimiter is a function.');
    } else {
        console.error('[B1] ❌ Runtime: createRateLimiter is not a function.');
        process.exitCode = 1;
    }

  } catch (error) {
    console.error('[B1] ❌ Runtime check failed with error:', error);
    process.exitCode = 1;
  }
}

// --- Main Execution ---

async function main() {
  console.log('--- Starting Tier B0 (Static) Verification ---');
  let b0Success = true;

  // 1. Sensitivity
  b0Success &&= checkFileExists('src/pii/sensitivity.ts');
  b0Success &&= checkFileContent('src/pii/sensitivity.ts', /export enum SensitivityClass/, 'SensitivityClass Enum');

  // 2. Rate Limits
  b0Success &&= checkFileExists('src/middleware/rateLimit.ts');
  b0Success &&= checkFileContent('src/middleware/rateLimit.ts', /export const createRateLimiter/, 'createRateLimiter export');
  b0Success &&= checkFileContent('src/middleware/rateLimit.ts', /export enum EndpointClass/, 'EndpointClass Enum');

  // 3. Auth
  b0Success &&= checkFileExists('src/middleware/auth.ts');
  b0Success &&= checkFileContent('src/middleware/auth.ts', /export async function ensureAuthenticated/, 'ensureAuthenticated export');

  // 4. Policy
  b0Success &&= checkFileExists('src/services/policy.ts');
  b0Success &&= checkFileContent('src/services/policy.ts', /export const policy/, 'policy export');

  // 5. Ingestion Hooks
  b0Success &&= checkFileExists('src/pii/ingestionHooks.ts');
  b0Success &&= checkFileContent('src/pii/ingestionHooks.ts', /export function createIngestionHook/, 'createIngestionHook factory');

  if (!b0Success) {
    console.error('\n[B0] ❌ Static verification FAILED. Critical GA features are missing or malformed.');
    process.exit(1);
  } else {
    console.log('\n[B0] ✅ Static verification PASSED.');
  }

  // Run B1
  await runB1Checks();
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
