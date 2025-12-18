#!/usr/bin/env npx tsx
/**
 * P25: Dependency Update Script
 * Safe, automated dependency updates with testing and rollback
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');

interface UpdateConfig {
  mode: 'patch' | 'minor' | 'major' | 'latest';
  dryRun: boolean;
  runTests: boolean;
  runLint: boolean;
  runTypecheck: boolean;
  interactive: boolean;
  excludePackages: string[];
  includePackages: string[];
  workspaces: string[];
}

interface PackageUpdate {
  name: string;
  currentVersion: string;
  newVersion: string;
  updateType: 'patch' | 'minor' | 'major';
  workspace?: string;
}

interface UpdateResult {
  success: boolean;
  updates: PackageUpdate[];
  errors: string[];
  testsPassed: boolean;
  lintPassed: boolean;
  typecheckPassed: boolean;
}

const DEFAULT_CONFIG: UpdateConfig = {
  mode: 'minor',
  dryRun: false,
  runTests: true,
  runLint: true,
  runTypecheck: true,
  interactive: false,
  excludePackages: [],
  includePackages: [],
  workspaces: [],
};

function loadConfig(): UpdateConfig {
  const configPath = join(ROOT_DIR, '.update-config.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return { ...DEFAULT_CONFIG, ...config };
  }
  return DEFAULT_CONFIG;
}

function backupLockfile(): string {
  const lockfilePath = join(ROOT_DIR, 'pnpm-lock.yaml');
  const backupPath = join(ROOT_DIR, 'pnpm-lock.yaml.backup');

  if (existsSync(lockfilePath)) {
    copyFileSync(lockfilePath, backupPath);
    console.log('Created lockfile backup');
  }

  return backupPath;
}

function restoreLockfile(backupPath: string): void {
  const lockfilePath = join(ROOT_DIR, 'pnpm-lock.yaml');

  if (existsSync(backupPath)) {
    copyFileSync(backupPath, lockfilePath);
    console.log('Restored lockfile from backup');
    unlinkSync(backupPath);
  }
}

function cleanupBackup(backupPath: string): void {
  if (existsSync(backupPath)) {
    unlinkSync(backupPath);
  }
}

function getOutdatedPackages(config: UpdateConfig): PackageUpdate[] {
  console.log('Checking for outdated packages...');

  const args = ['outdated', '--json'];
  if (config.workspaces.length > 0) {
    for (const ws of config.workspaces) {
      args.push('--filter', ws);
    }
  }

  const result = spawnSync('pnpm', args, {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });

  try {
    const outdatedData = JSON.parse(result.stdout || '{}');
    const updates: PackageUpdate[] = [];

    for (const [name, info] of Object.entries(outdatedData as Record<string, unknown>)) {
      const pkg = info as { current: string; latest: string; wanted: string };

      // Filter by include/exclude
      if (config.includePackages.length > 0 && !config.includePackages.includes(name)) {
        continue;
      }
      if (config.excludePackages.includes(name)) {
        continue;
      }

      const current = pkg.current;
      const target = config.mode === 'latest' ? pkg.latest : pkg.wanted;

      if (current === target) {
        continue;
      }

      const updateType = determineUpdateType(current, target);

      // Filter by update mode
      if (config.mode === 'patch' && updateType !== 'patch') {
        continue;
      }
      if (config.mode === 'minor' && updateType === 'major') {
        continue;
      }

      updates.push({
        name,
        currentVersion: current,
        newVersion: target,
        updateType,
      });
    }

    return updates;
  } catch {
    return [];
  }
}

function determineUpdateType(current: string, target: string): 'patch' | 'minor' | 'major' {
  const currentParts = current.replace(/^[\^~]/, '').split('.').map(Number);
  const targetParts = target.replace(/^[\^~]/, '').split('.').map(Number);

  if (currentParts[0] !== targetParts[0]) return 'major';
  if (currentParts[1] !== targetParts[1]) return 'minor';
  return 'patch';
}

function performUpdate(updates: PackageUpdate[], config: UpdateConfig): boolean {
  if (config.dryRun) {
    console.log('\n[DRY RUN] Would update the following packages:');
    for (const update of updates) {
      console.log(`  ${update.name}: ${update.currentVersion} → ${update.newVersion}`);
    }
    return true;
  }

  console.log('\nUpdating packages...');

  const packagesToUpdate = updates.map(u => `${u.name}@${u.newVersion}`);

  const result = spawnSync('pnpm', ['update', ...packagesToUpdate], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  return result.status === 0;
}

function runTests(): boolean {
  console.log('\nRunning tests...');

  const result = spawnSync('pnpm', ['test'], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    stdio: 'inherit',
    timeout: 600000, // 10 minutes
  });

  return result.status === 0;
}

function runLint(): boolean {
  console.log('\nRunning linter...');

  const result = spawnSync('pnpm', ['lint'], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    stdio: 'inherit',
    timeout: 300000, // 5 minutes
  });

  return result.status === 0;
}

function runTypecheck(): boolean {
  console.log('\nRunning typecheck...');

  const result = spawnSync('pnpm', ['typecheck'], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    stdio: 'inherit',
    timeout: 300000, // 5 minutes
  });

  return result.status === 0;
}

function generateChangelog(updates: PackageUpdate[]): string {
  const lines: string[] = [
    '# Dependency Updates',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Updates',
    '',
  ];

  const byType = {
    major: updates.filter(u => u.updateType === 'major'),
    minor: updates.filter(u => u.updateType === 'minor'),
    patch: updates.filter(u => u.updateType === 'patch'),
  };

  if (byType.major.length > 0) {
    lines.push('### Major Updates');
    lines.push('');
    for (const u of byType.major) {
      lines.push(`- **${u.name}**: ${u.currentVersion} → ${u.newVersion}`);
    }
    lines.push('');
  }

  if (byType.minor.length > 0) {
    lines.push('### Minor Updates');
    lines.push('');
    for (const u of byType.minor) {
      lines.push(`- ${u.name}: ${u.currentVersion} → ${u.newVersion}`);
    }
    lines.push('');
  }

  if (byType.patch.length > 0) {
    lines.push('### Patch Updates');
    lines.push('');
    for (const u of byType.patch) {
      lines.push(`- ${u.name}: ${u.currentVersion} → ${u.newVersion}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const config = loadConfig();

  // Parse CLI arguments
  const args = process.argv.slice(2);
  if (args.includes('--dry-run')) config.dryRun = true;
  if (args.includes('--no-test')) config.runTests = false;
  if (args.includes('--no-lint')) config.runLint = false;
  if (args.includes('--no-typecheck')) config.runTypecheck = false;
  if (args.includes('--patch')) config.mode = 'patch';
  if (args.includes('--minor')) config.mode = 'minor';
  if (args.includes('--major')) config.mode = 'major';
  if (args.includes('--latest')) config.mode = 'latest';

  console.log('========================================');
  console.log('     DEPENDENCY UPDATE TOOL');
  console.log('========================================');
  console.log(`Mode: ${config.mode}`);
  console.log(`Dry Run: ${config.dryRun}`);
  console.log('');

  // Get updates
  const updates = getOutdatedPackages(config);

  if (updates.length === 0) {
    console.log('✅ All dependencies are up to date!');
    return;
  }

  console.log(`\nFound ${updates.length} packages to update:`);
  for (const update of updates) {
    const icon = {
      major: '🔴',
      minor: '🟡',
      patch: '🟢',
    }[update.updateType];
    console.log(`  ${icon} ${update.name}: ${update.currentVersion} → ${update.newVersion}`);
  }

  const result: UpdateResult = {
    success: false,
    updates,
    errors: [],
    testsPassed: true,
    lintPassed: true,
    typecheckPassed: true,
  };

  // Backup lockfile
  const backupPath = backupLockfile();

  try {
    // Perform update
    const updateSuccess = performUpdate(updates, config);
    if (!updateSuccess) {
      result.errors.push('Package update failed');
      throw new Error('Package update failed');
    }

    // Run validations (if not dry run)
    if (!config.dryRun) {
      if (config.runTypecheck) {
        result.typecheckPassed = runTypecheck();
        if (!result.typecheckPassed) {
          result.errors.push('Typecheck failed');
        }
      }

      if (config.runLint) {
        result.lintPassed = runLint();
        if (!result.lintPassed) {
          result.errors.push('Lint failed');
        }
      }

      if (config.runTests) {
        result.testsPassed = runTests();
        if (!result.testsPassed) {
          result.errors.push('Tests failed');
        }
      }

      // Check if all validations passed
      if (!result.typecheckPassed || !result.lintPassed || !result.testsPassed) {
        console.log('\n❌ Validation failed, rolling back...');
        restoreLockfile(backupPath);

        // Reinstall to restore previous state
        spawnSync('pnpm', ['install', '--frozen-lockfile'], {
          cwd: ROOT_DIR,
          stdio: 'inherit',
        });

        throw new Error('Validation failed');
      }
    }

    result.success = true;
    cleanupBackup(backupPath);

    // Generate changelog
    const changelog = generateChangelog(updates);
    const changelogPath = join(ROOT_DIR, 'DEPENDENCY_UPDATES.md');
    writeFileSync(changelogPath, changelog);
    console.log(`\nChangelog written to ${changelogPath}`);

    console.log('\n========================================');
    console.log('✅ Dependencies updated successfully!');
    console.log('========================================');

  } catch (error) {
    console.log('\n========================================');
    console.log('❌ Update failed');
    console.log('========================================');
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Update failed:', error);
  process.exit(1);
});
