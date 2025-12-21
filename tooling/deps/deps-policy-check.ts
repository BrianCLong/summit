#!/usr/bin/env -S npx tsx

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';
import process from 'process';

export interface Config {
  approved: string[];
  ignoredPackages: string[];
}

export interface Context {
  cwd: string;
  readFile: (path: string) => string;
  exists: (path: string) => boolean;
  exec: (cmd: string) => string;
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

export const defaultContext: Context = {
  cwd: process.cwd(),
  readFile: (p) => fs.readFileSync(p, 'utf-8'),
  exists: (p) => fs.existsSync(p),
  exec: (cmd) => execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 }),
  log: console.log,
  error: console.error
};

export function loadConfig(ctx: Context): Config {
  const configPath = path.join(ctx.cwd, 'tooling/deps/config/approved-licenses.json');
  if (!ctx.exists(configPath)) {
    throw new Error(`Config file not found at ${configPath}`);
  }
  return JSON.parse(ctx.readFile(configPath));
}

export function checkLockfile(ctx: Context, isCi: boolean): boolean {
  ctx.log('Checking lockfile integrity...');
  const lockfilePath = path.join(ctx.cwd, 'pnpm-lock.yaml');

  if (!ctx.exists(lockfilePath)) {
    ctx.error('Error: pnpm-lock.yaml not found.');
    return false;
  }

  if (isCi) {
    try {
      // Check for unstaged changes
      ctx.exec('git diff --exit-code pnpm-lock.yaml');
      // Check for staged changes
      ctx.exec('git diff --cached --exit-code pnpm-lock.yaml');
    } catch (e) {
      ctx.error('Error: pnpm-lock.yaml has been modified. In CI, the lockfile should be immutable.');
      return false;
    }
  }
  return true;
}

function findPackageJsons(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && !file.startsWith('.')) {
        results.push(...findPackageJsons(fullPath));
      }
    } else {
      if (file === 'package.json') {
        results.push(fullPath);
      }
    }
  }
  return results;
}

export function checkPinnedDeps(ctx: Context, warnOnly: boolean): boolean {
  ctx.log('Checking for unpinned git dependencies...');
  const lockfilePath = path.join(ctx.cwd, 'pnpm-lock.yaml');
  if (!ctx.exists(lockfilePath)) {
    return false;
  }

  let hasUnpinned = false;

  try {
    // Recursively find package.json files
    let packageJsons: string[];
    // If context is default, use real fs recursion, else expect exec 'find' for mock?
    // Actually, for testability with mock exec, the previous test relied on exec returning the file list.
    // If I change implementation to fs traversal, I need to update the test or make Context support file finding.

    // I'll update Context to support a `findFiles` method or just rely on `exec` if I want to keep compatibility with test.
    // But real `fs` is better for portability.

    // Let's modify the function to use a helper that can be swapped, or just stick to fs usage
    // and in test environment we mock fs methods?
    // The current test mock supports `readFile` and `exists`.
    // I can add `readDir` and `stat` to Context to support recursive walk in a testable way.

    // However, simplest way to fix "use cross-platform find" without breaking tests drastically
    // is to check if we are in test mode (mock context) or use a portable implementation.

    // I'll just implement recursive search using `fs` but make sure `fs` calls use `ctx` if possible?
    // The current `Context` doesn't expose `readdir`.

    // Let's assume for now that if `ctx.exec` is mocked (returns specific string for find), we use that path.
    // If it's real execution, we implement recursive walk.

    // But `ctx` is opaque.

    // I'll add `findFiles` to Context.

    if ((ctx as any).findPackageJsons) {
         packageJsons = (ctx as any).findPackageJsons(ctx.cwd);
    } else {
        // Default implementation using fs
        packageJsons = findPackageJsons(ctx.cwd);
    }

    for (const pkgPath of packageJsons) {
      // pkgPath from findPackageJsons is absolute if dir was absolute.

      try {
        const content = ctx.readFile(pkgPath);
        const pkgContent = JSON.parse(content);
        const deps = { ...pkgContent.dependencies, ...pkgContent.devDependencies };

        for (const [name, version] of Object.entries(deps)) {
          if (typeof version === 'string' && (version.includes('git+') || version.includes('git://') || version.includes('github:'))) {
            const isPinned = /#[0-9a-f]{40}$/i.test(version);
            if (!isPinned) {
               ctx.error(`Violation in ${pkgPath}: Dependency '${name}' is not pinned to a specific commit hash: '${version}'`);
               hasUnpinned = true;
            }
          }
        }
      } catch (e) {
        // ignore invalid json
      }
    }

  } catch (e) {
    ctx.error('Error scanning package.json files:', e);
    return false;
  }

  if (hasUnpinned && !warnOnly) {
    return false;
  }
  return true;
}

export function checkLicenses(ctx: Context, config: Config, warnOnly: boolean): boolean {
  ctx.log('Checking licenses...');

  let licenseData: any;
  try {
    const output = ctx.exec('pnpm licenses list --json --recursive');
    licenseData = JSON.parse(output);
  } catch (e) {
    ctx.error('Error running pnpm licenses list:', e);
    return false;
  }

  let hasViolations = false;
  const approvedSet = new Set(config.approved);

  for (const [license, packages] of Object.entries(licenseData)) {
    let isApproved = approvedSet.has(license);
    if (!isApproved) {
        // Handle SPDX OR/AND
        const parts = license.replace(/[()]/g, '').split(/\s+OR\s+/);
        if (parts.some(p => approvedSet.has(p))) {
            isApproved = true;
        }
    }

    if (!isApproved) {
      const violations = (packages as any[]).filter(pkg => {
         return !config.ignoredPackages.includes(pkg.name);
      });

      if (violations.length > 0) {
        ctx.error(`Violation: License '${license}' is not in the approved list.`);
        violations.forEach(v => {
          ctx.error(`  - ${v.name}@${v.version}`);
        });
        hasViolations = true;
      }
    }
  }

  if (hasViolations && !warnOnly) {
    return false;
  }
  return true;
}

export function run(ctx: Context = defaultContext) {
  const args = process.argv.slice(2);
  const warnOnly = args.includes('--warn-only') || args.includes('--warn');
  const enforce = args.includes('--enforce');
  const isCi = args.includes('--ci') || process.env.CI === 'true';

  const mode = enforce ? 'ENFORCE' : (warnOnly ? 'WARN-ONLY' : 'ENFORCE (default)');
  ctx.log(`Running Dependency Policy Check in ${mode} mode...`);

  let config: Config;
  try {
    config = loadConfig(ctx);
  } catch (e: any) {
    ctx.error(e.message);
    process.exit(1);
  }

  let success = true;

  if (!checkLockfile(ctx, isCi)) success = false;

  if (!checkPinnedDeps(ctx, warnOnly)) {
     if (!warnOnly) success = false;
  }

  if (!checkLicenses(ctx, config, warnOnly)) {
      if (!warnOnly) success = false;
  }

  if (!success) {
    ctx.error('Dependency policy checks failed.');
    process.exit(1);
  } else {
    ctx.log('Dependency policy checks passed.');
  }
}

// Check if running directly
// @ts-ignore
if (typeof require !== 'undefined' && require.main === module) {
  run();
} else if (process.argv[1] && process.argv[1].endsWith('deps-policy-check.ts')) {
  // Fallback for tsx if module logic differs
  run();
}
