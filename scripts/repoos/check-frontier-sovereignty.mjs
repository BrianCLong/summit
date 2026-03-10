#!/usr/bin/env node

/**
 * Frontier Sovereignty Check
 *
 * Enforces the operational rule:
 * "Humans never modify frontier-owned code directly."
 *
 * All changes — human or AI — must enter through:
 * patch submission → concern router → frontier → synthesis → PR
 *
 * This prevents:
 * - Frontier invalidation
 * - Patch market corruption
 * - Merge queue oscillation
 *
 * Without this rule, a single human commit can invalidate dozens of
 * candidate patches and destabilize the autonomous engineering system.
 */

import fs from 'fs/promises';
import path from 'path';
import { exec as execSync } from 'child_process';
import { promisify } from 'util';
import yaml from 'yaml';

const exec = promisify(execSync);

/**
 * Frontier Sovereignty Checker
 */
class FrontierSovereigntyChecker {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
    this.configFile = config.configFile || '.repoos/frontier-ownership.yml';
    this.frontierPaths = new Map();
  }

  /**
   * Initialize checker
   */
  async initialize() {
    await this.loadFrontierOwnership();
  }

  /**
   * Check if PR violates frontier sovereignty
   * @returns {Object} Check result
   */
  async checkPR() {
    console.log('\n🔍 Checking Frontier Sovereignty...\n');

    // Get changed files in PR
    const changedFiles = await this.getChangedFiles();

    console.log(`Files changed: ${changedFiles.length}\n`);

    // Check each file against frontier ownership
    const violations = [];

    for (const file of changedFiles) {
      const owner = this.getFrontierOwner(file);

      if (owner) {
        // Check if frontier is active
        const isActive = await this.isFrontierActive(owner);

        if (isActive) {
          violations.push({
            file,
            frontier: owner,
            severity: 'error'
          });
        }
      }
    }

    const passed = violations.length === 0;

    if (passed) {
      console.log('✅ Frontier Sovereignty Check: PASSED\n');
      console.log('   No direct modifications to frontier-owned domains detected.\n');
    } else {
      console.log('❌ Frontier Sovereignty Check: FAILED\n');
      console.log(`   ${violations.length} violation(s) detected:\n`);

      for (const v of violations) {
        console.log(`   ❌ ${v.file}`);
        console.log(`      Owned by frontier: ${v.frontier}`);
        console.log(`      Frontier is ACTIVE\n`);
      }

      console.log('   ⚠️  Direct modification of frontier-owned domains is prohibited.\n');
      console.log('   To fix:');
      console.log('   1. Submit changes as a patch proposal:');
      console.log(`      repoos submit-patch ${violations[0].frontier} <description>`);
      console.log('   2. Let the frontier engine synthesize the change');
      console.log('   3. Merge the generated PR\n');

      console.log('   Why this rule exists:');
      console.log('   - Prevents invalidation of pending patches');
      console.log('   - Maintains patch market integrity');
      console.log('   - Avoids merge queue oscillation');
      console.log('   - Protects autonomous evolution stability\n');
    }

    return {
      passed,
      violations,
      changedFiles: changedFiles.length
    };
  }

  /**
   * Get list of changed files in PR
   * @returns {Array} List of file paths
   */
  async getChangedFiles() {
    try {
      // Try to get files from GitHub PR context
      const prNumber = process.env.GITHUB_PR_NUMBER || process.env.PR_NUMBER;

      if (prNumber) {
        const { stdout } = await exec(`gh pr view ${prNumber} --json files --jq '.files[].path'`);
        return stdout.trim().split('\n').filter(f => f);
      }

      // Fallback: get diff against base branch
      const baseBranch = process.env.GITHUB_BASE_REF || 'main';
      const { stdout } = await exec(`git diff --name-only origin/${baseBranch}...HEAD`);
      return stdout.trim().split('\n').filter(f => f);
    } catch (error) {
      console.error(`⚠️  Failed to get changed files: ${error.message}`);
      return [];
    }
  }

  /**
   * Get frontier owner for a file path
   * @param {string} filePath - File path
   * @returns {string|null} Frontier ID or null
   */
  getFrontierOwner(filePath) {
    for (const [frontier, paths] of this.frontierPaths.entries()) {
      for (const pattern of paths) {
        if (this.matchPath(filePath, pattern)) {
          return frontier;
        }
      }
    }

    return null;
  }

  /**
   * Check if frontier is currently active
   * @param {string} frontierID - Frontier ID
   * @returns {boolean} True if active
   */
  async isFrontierActive(frontierID) {
    const frontierDir = path.join(this.repoRoot, '.repoos', 'frontiers', frontierID);

    try {
      const frontierFile = path.join(frontierDir, 'frontier.json');
      const data = await fs.readFile(frontierFile, 'utf8');
      const frontier = JSON.parse(data);

      // Frontier is active if it has pending patches or is in synthesis
      return (
        frontier.state === 'collecting' ||
        frontier.state === 'converging' ||
        frontier.state === 'synthesizing' ||
        (frontier.patches && frontier.patches.length > 0)
      );
    } catch (error) {
      // Frontier doesn't exist or has no state file
      return false;
    }
  }

  /**
   * Match file path against pattern
   * @param {string} filePath - File path
   * @param {string} pattern - Glob pattern
   * @returns {boolean} True if matches
   */
  matchPath(filePath, pattern) {
    // Simple glob matching (** = any directory, * = any file)
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');

    return new RegExp(`^${regex}$`).test(filePath);
  }

  /**
   * Load frontier ownership configuration
   */
  async loadFrontierOwnership() {
    const configPath = path.join(this.repoRoot, this.configFile);

    try {
      const data = await fs.readFile(configPath, 'utf8');
      const config = yaml.parse(data);

      // Parse frontier ownership
      for (const [frontier, spec] of Object.entries(config)) {
        if (spec.paths && Array.isArray(spec.paths)) {
          this.frontierPaths.set(frontier, spec.paths);
        }
      }

      console.log(`📂 Loaded ownership for ${this.frontierPaths.size} frontiers`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  No frontier ownership config found, using defaults');
        this.loadDefaultOwnership();
      } else {
        throw error;
      }
    }
  }

  /**
   * Load default frontier ownership
   */
  loadDefaultOwnership() {
    // Default ownership patterns for common concerns
    this.frontierPaths.set('auth-system', [
      'services/auth/**',
      'packages/auth/**',
      'server/src/auth/**'
    ]);

    this.frontierPaths.set('graphql-layer', [
      'gateway/graphql-bff/**',
      'services/*/graphql/**',
      '**/*.graphql'
    ]);

    this.frontierPaths.set('evidence-graph', [
      'packages/evidence-graph/**',
      'services/evidence-**/**'
    ]);
  }

  /**
   * Generate example ownership config
   */
  async generateExampleConfig() {
    const example = {
      'auth-system': {
        paths: [
          'services/auth/**',
          'packages/auth/**',
          'server/src/auth/**'
        ],
        description: 'Authentication and authorization systems'
      },
      'graphql-layer': {
        paths: [
          'gateway/graphql-bff/**',
          'services/*/graphql/**',
          '**/*.graphql'
        ],
        description: 'GraphQL API layer'
      },
      'evidence-graph': {
        paths: [
          'packages/evidence-graph/**',
          'services/evidence-**/**'
        ],
        description: 'Evidence and provenance graph'
      }
    };

    const configPath = path.join(this.repoRoot, this.configFile);
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    const yamlContent = yaml.stringify(example);
    await fs.writeFile(configPath, yamlContent);

    console.log(`✅ Generated example config at ${this.configFile}`);
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new FrontierSovereigntyChecker();

  const command = process.argv[2];

  switch (command) {
    case 'check':
      await checker.initialize();
      const result = await checker.checkPR();

      // Exit with error code if violations found
      if (!result.passed) {
        process.exit(1);
      }
      break;

    case 'generate-config':
      await checker.generateExampleConfig();
      break;

    default:
      console.log('Frontier Sovereignty Checker\n');
      console.log('Enforces: Humans never modify frontier-owned code directly\n');
      console.log('Usage:');
      console.log('  node check-frontier-sovereignty.mjs check            - Check current PR');
      console.log('  node check-frontier-sovereignty.mjs generate-config  - Generate example config');
      console.log('\nConfiguration:');
      console.log('  .repoos/frontier-ownership.yml - Defines frontier ownership patterns');
      console.log('\nOperational Rule:');
      console.log('  All changes must enter through patch submission system.');
      console.log('  Direct commits to frontier-owned domains are rejected.\n');
  }
}

export default FrontierSovereigntyChecker;
