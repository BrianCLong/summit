import fs from 'fs-extra';
import path from 'path';
import { manifestSchema } from './schemas';

export interface VerifyBundleResult {
  valid: boolean;
  errors: string[];
}

export async function verifyBundle(bundleDir: string): Promise<VerifyBundleResult> {
  const errors: string[] = [];
  const manifestPath = path.join(bundleDir, 'manifest.json');
  if (!(await fs.pathExists(manifestPath))) {
    errors.push('manifest.json is missing');
    return { valid: false, errors };
  }

  try {
    const manifest = await fs.readJson(manifestPath);
    manifestSchema.parse(manifest);
    if (!manifest.signature) {
      errors.push('signature missing; unsigned bundles are not allowed');
    }
  } catch (error) {
    errors.push(`manifest invalid: ${(error as Error).message}`);
  }

  const payloadDir = path.join(bundleDir, 'payload');
  if (!(await fs.pathExists(payloadDir))) {
    errors.push('payload/ directory is missing');
  }

  return { valid: errors.length === 0, errors };
}
