import * as fs from 'node:fs';
import * as path from 'node:path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface DetectionOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
}

/**
 * Detects the package manager used in the project based on a priority order.
 * Priority: env var -> project config -> package.json -> lockfiles -> fallback.
 */
export function detectPackageManager(
  options: DetectionOptions = {}
): PackageManager {
  const cwd = options.cwd || process.cwd();
  const env = options.env || process.env;

  // 1. Env var override
  if (env.SUMMIT_PACKAGE_MANAGER) {
    return env.SUMMIT_PACKAGE_MANAGER as PackageManager;
  }

  // 2. Project config (.claude/package-manager.json)
  const projectConfigPath = path.join(cwd, '.claude', 'package-manager.json');
  if (fs.existsSync(projectConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
      if (config.packageManager) return config.packageManager;
    } catch (e) {
      // ignore parse errors
    }
  }

  // 3. package.json#packageManager
  const packageJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.packageManager) {
        if (pkg.packageManager.startsWith('pnpm')) return 'pnpm';
        if (pkg.packageManager.startsWith('yarn')) return 'yarn';
        if (pkg.packageManager.startsWith('npm')) return 'npm';
        if (pkg.packageManager.startsWith('bun')) return 'bun';
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  // 4. Lockfiles
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) return 'npm';
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun';

  // 5. Fallback
  return 'npm';
}
