/**
 * Auto-PR Fixer for Vulnerability Remediation
 * @module .github/scanners/auto-pr-fixer
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { loadConfig, SUPPORTED_ECOSYSTEMS, FIX_CONFIDENCE, type SupportedEcosystem } from './config.js';
import type {
  Vulnerability,
  VulnerabilityScanResult,
  FixSuggestion,
  AutoFixResult,
} from './types.js';

export interface AutoFixOptions {
  scanResult: VulnerabilityScanResult;
  workingDirectory?: string;
  dryRun?: boolean;
  createPR?: boolean;
  baseBranch?: string;
  maxFixes?: number;
  minConfidence?: 'high' | 'medium' | 'low';
  excludeBreakingChanges?: boolean;
  commitPrefix?: string;
}

interface PackageUpdate {
  ecosystem: SupportedEcosystem;
  packageName: string;
  currentVersion: string;
  targetVersion: string;
  lockFile?: string;
  manifestFile?: string;
}

/**
 * Auto-PR Fixer for automated vulnerability remediation
 */
export class AutoPRFixer {
  private workingDirectory: string;

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * Analyze vulnerabilities and generate fix suggestions
   */
  async analyzeFixSuggestions(scanResult: VulnerabilityScanResult): Promise<FixSuggestion[]> {
    const suggestions: FixSuggestion[] = [];

    for (const vuln of scanResult.vulnerabilities) {
      if (!vuln.fixedVersion) {
        continue; // No fix available
      }

      const suggestion = await this.createFixSuggestion(vuln);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Sort by confidence (high first) and severity
    suggestions.sort((a, b) => {
      const confidenceOrder = { high: 0, medium: 1, low: 2 };
      const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      if (confDiff !== 0) return confDiff;

      // If same confidence, prioritize non-breaking changes
      if (a.breakingChange !== b.breakingChange) {
        return a.breakingChange ? 1 : -1;
      }

      return 0;
    });

    return suggestions;
  }

  /**
   * Apply fixes and optionally create PR
   */
  async applyFixes(options: AutoFixOptions): Promise<AutoFixResult> {
    const {
      scanResult,
      workingDirectory = this.workingDirectory,
      dryRun = false,
      createPR = false,
      baseBranch = 'main',
      maxFixes = 10,
      minConfidence = 'medium',
      excludeBreakingChanges = true,
      commitPrefix = 'fix(security):',
    } = options;

    const result: AutoFixResult = {
      success: true,
      fixesApplied: [],
      fixesFailed: [],
      summary: {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      },
    };

    try {
      // Get fix suggestions
      const suggestions = await this.analyzeFixSuggestions(scanResult);

      // Filter suggestions based on options
      const filteredSuggestions = suggestions.filter((s) => {
        if (excludeBreakingChanges && s.breakingChange) {
          result.summary.skipped++;
          return false;
        }

        const confidenceOrder = { high: 0, medium: 1, low: 2 };
        if (confidenceOrder[s.confidence] > confidenceOrder[minConfidence]) {
          result.summary.skipped++;
          return false;
        }

        return true;
      });

      // Limit number of fixes
      const fixesToApply = filteredSuggestions.slice(0, maxFixes);

      if (fixesToApply.length === 0) {
        console.log('ℹ️  No applicable fixes found');
        return result;
      }

      console.log(`🔧 Attempting to apply ${fixesToApply.length} fixes`);

      // Create branch for fixes if creating PR
      let branchName: string | undefined;
      if (createPR && !dryRun) {
        branchName = `security/auto-fix-${Date.now()}`;
        await this.executeCommand('git', ['checkout', '-b', branchName], workingDirectory);
      }

      // Apply each fix
      for (const fix of fixesToApply) {
        result.summary.attempted++;

        if (dryRun) {
          console.log(`[DRY RUN] Would apply fix for ${fix.vulnerabilityId}: ${fix.package} ${fix.currentVersion} -> ${fix.fixedVersion}`);
          result.fixesApplied.push(fix);
          result.summary.succeeded++;
          continue;
        }

        try {
          await this.applyFix(fix, workingDirectory);
          result.fixesApplied.push(fix);
          result.summary.succeeded++;

          // Commit the fix
          await this.executeCommand(
            'git',
            ['add', '-A'],
            workingDirectory
          );
          await this.executeCommand(
            'git',
            ['commit', '-m', `${commitPrefix} update ${fix.package} to ${fix.fixedVersion} (${fix.vulnerabilityId})`],
            workingDirectory
          );

          console.log(`✅ Fixed ${fix.vulnerabilityId}: ${fix.package} -> ${fix.fixedVersion}`);
        } catch (error: unknown) {
          result.fixesFailed.push({
            fix,
            error: error instanceof Error ? error.message : String(error),
          });
          result.summary.failed++;
          console.log(`❌ Failed to fix ${fix.vulnerabilityId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Create PR if requested
      if (createPR && !dryRun && branchName && result.summary.succeeded > 0) {
        const prResult = await this.createPullRequest(
          branchName,
          baseBranch,
          result.fixesApplied,
          workingDirectory
        );

        if (prResult.success) {
          result.prNumber = prResult.prNumber;
          result.prUrl = prResult.prUrl;
          console.log(`🔗 Pull request created: ${result.prUrl}`);
        } else {
          console.log(`⚠️  Failed to create PR: ${prResult.error}`);
        }
      }

      result.success = result.summary.failed === 0;
      return result;
    } catch (error: unknown) {
      result.success = false;
      console.error('Auto-fix failed:', error);
      return result;
    }
  }

  /**
   * Create fix suggestion for a vulnerability
   */
  private async createFixSuggestion(vuln: Vulnerability): Promise<FixSuggestion | null> {
    if (!vuln.fixedVersion) {
      return null;
    }

    const ecosystem = await this.detectEcosystem(vuln.affectedPackage);
    if (!ecosystem) {
      return null;
    }

    const confidence = this.calculateConfidence(
      vuln.installedVersion,
      vuln.fixedVersion
    );

    const breakingChange = this.isBreakingChange(
      vuln.installedVersion,
      vuln.fixedVersion
    );

    const commands = this.getUpdateCommands(
      ecosystem,
      vuln.affectedPackage,
      vuln.fixedVersion
    );

    return {
      vulnerabilityId: vuln.id,
      package: vuln.affectedPackage,
      currentVersion: vuln.installedVersion,
      fixedVersion: vuln.fixedVersion,
      confidence,
      breakingChange,
      automatable: commands.length > 0,
      commands,
      prTitle: `fix(security): update ${vuln.affectedPackage} to ${vuln.fixedVersion}`,
      prBody: this.generatePRBody(vuln),
    };
  }

  /**
   * Apply a single fix
   */
  private async applyFix(fix: FixSuggestion, workingDirectory: string): Promise<void> {
    if (!fix.commands || fix.commands.length === 0) {
      throw new Error('No update commands available');
    }

    for (const command of fix.commands) {
      const [cmd, ...args] = command.split(' ');
      const result = await this.executeCommand(cmd, args, workingDirectory);

      if (!result.success) {
        throw new Error(`Command failed: ${command}\n${result.stderr}`);
      }
    }
  }

  /**
   * Create pull request with fixes
   */
  private async createPullRequest(
    branchName: string,
    baseBranch: string,
    fixes: FixSuggestion[],
    workingDirectory: string
  ): Promise<{ success: boolean; prNumber?: number; prUrl?: string; error?: string }> {
    try {
      // Push branch
      await this.executeCommand('git', ['push', '-u', 'origin', branchName], workingDirectory);

      // Create PR using GitHub CLI
      const title = fixes.length === 1
        ? fixes[0].prTitle!
        : `fix(security): remediate ${fixes.length} vulnerabilities`;

      const body = this.generateCombinedPRBody(fixes);

      const result = await this.executeCommand(
        'gh',
        [
          'pr',
          'create',
          '--base',
          baseBranch,
          '--head',
          branchName,
          '--title',
          title,
          '--body',
          body,
          '--label',
          'security,automated',
        ],
        workingDirectory
      );

      if (!result.success) {
        return { success: false, error: result.stderr };
      }

      // Parse PR URL from output
      const prUrl = result.stdout.trim();
      const prNumber = parseInt(prUrl.split('/').pop() || '0', 10);

      return { success: true, prNumber, prUrl };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Detect package ecosystem
   */
  private async detectEcosystem(packageName: string): Promise<SupportedEcosystem | null> {
    // Check for lock files to determine ecosystem
    const lockFiles: Record<string, SupportedEcosystem> = {
      'package-lock.json': 'npm',
      'yarn.lock': 'yarn',
      'pnpm-lock.yaml': 'pnpm',
      'Pipfile.lock': 'pip',
      'poetry.lock': 'poetry',
      'go.sum': 'go',
      'Cargo.lock': 'cargo',
      'Gemfile.lock': 'rubygems',
      'composer.lock': 'composer',
    };

    for (const [lockFile, ecosystem] of Object.entries(lockFiles)) {
      try {
        await fs.access(path.join(this.workingDirectory, lockFile));
        return ecosystem;
      } catch {
        // Lock file doesn't exist
      }
    }

    // Default to npm for JavaScript packages
    return 'npm';
  }

  /**
   * Calculate fix confidence based on version change
   */
  private calculateConfidence(
    currentVersion: string,
    fixedVersion: string
  ): 'high' | 'medium' | 'low' {
    const current = this.parseVersion(currentVersion);
    const fixed = this.parseVersion(fixedVersion);

    if (!current || !fixed) {
      return 'low';
    }

    // Same major version
    if (current.major === fixed.major) {
      // Same minor version (patch update)
      if (current.minor === fixed.minor) {
        return 'high';
      }
      // Minor version bump
      return 'medium';
    }

    // Major version change
    return 'low';
  }

  /**
   * Determine if version change is breaking
   */
  private isBreakingChange(currentVersion: string, fixedVersion: string): boolean {
    const current = this.parseVersion(currentVersion);
    const fixed = this.parseVersion(fixedVersion);

    if (!current || !fixed) {
      return true; // Assume breaking if we can't parse
    }

    return fixed.major > current.major;
  }

  /**
   * Parse semantic version
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
    if (!match) {
      return null;
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  }

  /**
   * Get update commands for ecosystem
   */
  private getUpdateCommands(
    ecosystem: SupportedEcosystem,
    packageName: string,
    version: string
  ): string[] {
    switch (ecosystem) {
      case 'npm':
        return [`npm install ${packageName}@${version}`];
      case 'yarn':
        return [`yarn upgrade ${packageName}@${version}`];
      case 'pnpm':
        return [`pnpm update ${packageName}@${version}`];
      case 'pip':
        return [`pip install ${packageName}==${version}`];
      case 'poetry':
        return [`poetry add ${packageName}@${version}`];
      case 'go':
        return [`go get ${packageName}@v${version}`];
      case 'cargo':
        return [`cargo update -p ${packageName} --precise ${version}`];
      case 'rubygems':
        return [`bundle update ${packageName}`];
      case 'composer':
        return [`composer require ${packageName}:${version}`];
      default:
        return [];
    }
  }

  /**
   * Generate PR body for a single vulnerability
   */
  private generatePRBody(vuln: Vulnerability): string {
    return `## Security Fix

This PR addresses a security vulnerability.

### Vulnerability Details

- **ID**: ${vuln.id}
- **Severity**: ${vuln.severity.toUpperCase()}
- **CVSS Score**: ${vuln.cvssScore || 'N/A'}
- **Package**: ${vuln.affectedPackage}
- **Current Version**: ${vuln.installedVersion}
- **Fixed Version**: ${vuln.fixedVersion}

### Description

${vuln.description || 'No description available.'}

### References

${vuln.references?.map((ref) => `- ${ref}`).join('\n') || 'No references available.'}

---
*This PR was automatically generated by the security auto-fix system.*
`;
  }

  /**
   * Generate combined PR body for multiple fixes
   */
  private generateCombinedPRBody(fixes: FixSuggestion[]): string {
    const fixList = fixes
      .map((f) => `- **${f.vulnerabilityId}**: ${f.package} ${f.currentVersion} → ${f.fixedVersion}`)
      .join('\n');

    return `## Security Fixes

This PR addresses ${fixes.length} security vulnerabilities.

### Fixed Vulnerabilities

${fixList}

### Summary

| Confidence | Count |
|------------|-------|
| High | ${fixes.filter((f) => f.confidence === 'high').length} |
| Medium | ${fixes.filter((f) => f.confidence === 'medium').length} |
| Low | ${fixes.filter((f) => f.confidence === 'low').length} |

---
*This PR was automatically generated by the security auto-fix system.*
`;
  }

  /**
   * Execute a command
   */
  private executeCommand(
    command: string,
    args: string[],
    cwd?: string
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn(command, args, { cwd: cwd || this.workingDirectory });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ success: code === 0, stdout, stderr });
      });

      proc.on('error', (error) => {
        resolve({ success: false, stdout, stderr: error.message });
      });
    });
  }
}

/**
 * Create a new auto-PR fixer instance
 */
export function createAutoPRFixer(workingDirectory?: string): AutoPRFixer {
  return new AutoPRFixer(workingDirectory);
}
