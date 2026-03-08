#!/usr/bin/env npx tsx
"use strict";
/**
 * P25: Dependency Update Script
 * Safe, automated dependency updates with testing and rollback
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const __dirname = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
const ROOT_DIR = (0, node_path_1.join)(__dirname, '../..');
const DEFAULT_CONFIG = {
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
function loadConfig() {
    const configPath = (0, node_path_1.join)(ROOT_DIR, '.update-config.json');
    if ((0, node_fs_1.existsSync)(configPath)) {
        const config = JSON.parse((0, node_fs_1.readFileSync)(configPath, 'utf-8'));
        return { ...DEFAULT_CONFIG, ...config };
    }
    return DEFAULT_CONFIG;
}
function backupLockfile() {
    const lockfilePath = (0, node_path_1.join)(ROOT_DIR, 'pnpm-lock.yaml');
    const backupPath = (0, node_path_1.join)(ROOT_DIR, 'pnpm-lock.yaml.backup');
    if ((0, node_fs_1.existsSync)(lockfilePath)) {
        (0, node_fs_1.copyFileSync)(lockfilePath, backupPath);
        console.log('Created lockfile backup');
    }
    return backupPath;
}
function restoreLockfile(backupPath) {
    const lockfilePath = (0, node_path_1.join)(ROOT_DIR, 'pnpm-lock.yaml');
    if ((0, node_fs_1.existsSync)(backupPath)) {
        (0, node_fs_1.copyFileSync)(backupPath, lockfilePath);
        console.log('Restored lockfile from backup');
        (0, node_fs_1.unlinkSync)(backupPath);
    }
}
function cleanupBackup(backupPath) {
    if ((0, node_fs_1.existsSync)(backupPath)) {
        (0, node_fs_1.unlinkSync)(backupPath);
    }
}
function getOutdatedPackages(config) {
    console.log('Checking for outdated packages...');
    const args = ['outdated', '--json'];
    if (config.workspaces.length > 0) {
        for (const ws of config.workspaces) {
            args.push('--filter', ws);
        }
    }
    const result = (0, node_child_process_1.spawnSync)('pnpm', args, {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
    });
    try {
        const outdatedData = JSON.parse(result.stdout || '{}');
        const updates = [];
        for (const [name, info] of Object.entries(outdatedData)) {
            const pkg = info;
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
    }
    catch {
        return [];
    }
}
function determineUpdateType(current, target) {
    const currentParts = current.replace(/^[\^~]/, '').split('.').map(Number);
    const targetParts = target.replace(/^[\^~]/, '').split('.').map(Number);
    if (currentParts[0] !== targetParts[0])
        return 'major';
    if (currentParts[1] !== targetParts[1])
        return 'minor';
    return 'patch';
}
function performUpdate(updates, config) {
    if (config.dryRun) {
        console.log('\n[DRY RUN] Would update the following packages:');
        for (const update of updates) {
            console.log(`  ${update.name}: ${update.currentVersion} → ${update.newVersion}`);
        }
        return true;
    }
    console.log('\nUpdating packages...');
    const packagesToUpdate = updates.map(u => `${u.name}@${u.newVersion}`);
    const result = (0, node_child_process_1.spawnSync)('pnpm', ['update', ...packagesToUpdate], {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: 'inherit',
    });
    return result.status === 0;
}
function runTests() {
    console.log('\nRunning tests...');
    const result = (0, node_child_process_1.spawnSync)('pnpm', ['test'], {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: 'inherit',
        timeout: 600000, // 10 minutes
    });
    return result.status === 0;
}
function runLint() {
    console.log('\nRunning linter...');
    const result = (0, node_child_process_1.spawnSync)('pnpm', ['lint'], {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: 'inherit',
        timeout: 300000, // 5 minutes
    });
    return result.status === 0;
}
function runTypecheck() {
    console.log('\nRunning typecheck...');
    const result = (0, node_child_process_1.spawnSync)('pnpm', ['typecheck'], {
        cwd: ROOT_DIR,
        encoding: 'utf-8',
        stdio: 'inherit',
        timeout: 300000, // 5 minutes
    });
    return result.status === 0;
}
function generateChangelog(updates) {
    const lines = [
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
async function main() {
    const config = loadConfig();
    // Parse CLI arguments
    const args = process.argv.slice(2);
    if (args.includes('--dry-run'))
        config.dryRun = true;
    if (args.includes('--no-test'))
        config.runTests = false;
    if (args.includes('--no-lint'))
        config.runLint = false;
    if (args.includes('--no-typecheck'))
        config.runTypecheck = false;
    if (args.includes('--patch'))
        config.mode = 'patch';
    if (args.includes('--minor'))
        config.mode = 'minor';
    if (args.includes('--major'))
        config.mode = 'major';
    if (args.includes('--latest'))
        config.mode = 'latest';
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
    const result = {
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
                (0, node_child_process_1.spawnSync)('pnpm', ['install', '--frozen-lockfile'], {
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
        const changelogPath = (0, node_path_1.join)(ROOT_DIR, 'DEPENDENCY_UPDATES.md');
        (0, node_fs_1.writeFileSync)(changelogPath, changelog);
        console.log(`\nChangelog written to ${changelogPath}`);
        console.log('\n========================================');
        console.log('✅ Dependencies updated successfully!');
        console.log('========================================');
    }
    catch (error) {
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
