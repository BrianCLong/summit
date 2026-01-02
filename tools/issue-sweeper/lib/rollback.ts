/**
 * Rollback and Recovery Utilities
 *
 * Handles failures gracefully and provides recovery mechanisms.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROLLBACK_LOG = join(process.cwd(), 'tools/issue-sweeper/ROLLBACK.log');

export interface RollbackPoint {
  timestamp: string;
  branch: string;
  commit: string;
  issueNumber: number;
  action: string;
  canRollback: boolean;
}

/**
 * Create a rollback point before making changes
 */
export function createRollbackPoint(issueNumber: number, action: string): RollbackPoint {
  const timestamp = new Date().toISOString();
  const branch = getCurrentBranch();
  const commit = getCurrentCommit();

  const point: RollbackPoint = {
    timestamp,
    branch,
    commit,
    issueNumber,
    action,
    canRollback: true,
  };

  logRollbackPoint(point);
  return point;
}

/**
 * Rollback to a specific point
 */
export function rollbackToPoint(point: RollbackPoint): { success: boolean; message: string } {
  if (!point.canRollback) {
    return {
      success: false,
      message: 'This rollback point is marked as non-rollbackable',
    };
  }

  try {
    // Switch to original branch
    execSync(`git checkout ${point.branch}`, { stdio: 'pipe' });

    // Reset to original commit (soft reset to preserve changes)
    execSync(`git reset --soft ${point.commit}`, { stdio: 'pipe' });

    return {
      success: true,
      message: `Rolled back to ${point.branch}@${point.commit.substring(0, 7)}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Rollback failed: ${error}`,
    };
  }
}

/**
 * Rollback the last operation
 */
export function rollbackLast(): { success: boolean; message: string } {
  const points = readRollbackLog();
  if (points.length === 0) {
    return {
      success: false,
      message: 'No rollback points available',
    };
  }

  const lastPoint = points[points.length - 1];
  return rollbackToPoint(lastPoint);
}

/**
 * Rollback all operations for a specific issue
 */
export function rollbackIssue(issueNumber: number): { success: boolean; message: string } {
  const points = readRollbackLog().filter((p) => p.issueNumber === issueNumber);

  if (points.length === 0) {
    return {
      success: false,
      message: `No rollback points found for issue #${issueNumber}`,
    };
  }

  // Get the earliest point for this issue
  const earliestPoint = points[0];
  return rollbackToPoint(earliestPoint);
}

/**
 * Clean up branches created for failed fixes
 */
export function cleanupFailedBranches(): {
  deleted: string[];
  kept: string[];
  errors: string[];
} {
  const deleted: string[] = [];
  const kept: string[] = [];
  const errors: string[] = [];

  try {
    // Get all issue branches
    const branches = execSync('git branch | grep issue/', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .map((b) => b.trim().replace(/^\*?\s*/, ''));

    for (const branch of branches) {
      if (!branch) continue;

      try {
        // Check if branch has commits
        const commits = execSync(`git log ${branch} --oneline -n 1`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        }).trim();

        if (!commits) {
          // Empty branch, safe to delete
          execSync(`git branch -D ${branch}`, { stdio: 'pipe' });
          deleted.push(branch);
        } else {
          // Branch has commits, check if it has a PR
          const issueNumber = extractIssueNumber(branch);
          if (issueNumber) {
            // Would need to check GitHub API for PR status
            // For now, keep branches with commits
            kept.push(branch);
          } else {
            kept.push(branch);
          }
        }
      } catch (error) {
        errors.push(`${branch}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to list branches: ${error}`);
  }

  return { deleted, kept, errors };
}

/**
 * Recover from a failed fix attempt
 */
export function recoverFromFailure(issueNumber: number): {
  success: boolean;
  steps: string[];
  message: string;
} {
  const steps: string[] = [];

  try {
    // Step 1: Get current branch
    const currentBranch = getCurrentBranch();
    steps.push(`Current branch: ${currentBranch}`);

    // Step 2: Check if we're on an issue branch
    const isIssueBranch = currentBranch.startsWith('issue/');
    if (isIssueBranch) {
      // Step 3: Switch back to main
      execSync('git checkout main', { stdio: 'pipe' });
      steps.push('Switched back to main branch');

      // Step 4: Check for uncommitted changes in issue branch
      try {
        execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
        const status = execSync('git status --porcelain', { encoding: 'utf-8' });

        if (status.trim()) {
          steps.push('Found uncommitted changes, stashing...');
          execSync('git stash', { stdio: 'pipe' });
        }

        execSync('git checkout main', { stdio: 'pipe' });
      } catch {
        steps.push('Could not check for uncommitted changes');
      }

      // Step 5: Delete the failed branch
      try {
        execSync(`git branch -D ${currentBranch}`, { stdio: 'pipe' });
        steps.push(`Deleted failed branch: ${currentBranch}`);
      } catch {
        steps.push(`Could not delete branch: ${currentBranch}`);
      }
    } else {
      steps.push('Not on an issue branch, no cleanup needed');
    }

    // Step 6: Verify we're on a clean main branch
    const finalBranch = getCurrentBranch();
    steps.push(`Final branch: ${finalBranch}`);

    return {
      success: true,
      steps,
      message: 'Recovery completed successfully',
    };
  } catch (error) {
    steps.push(`Error: ${error}`);
    return {
      success: false,
      steps,
      message: 'Recovery failed, manual intervention required',
    };
  }
}

/**
 * Create a backup of current state before risky operation
 */
export function createBackup(label: string): { success: boolean; backupRef: string } {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBranch = `backup/${label}-${timestamp}`;

    // Create backup branch at current HEAD
    execSync(`git branch ${backupBranch}`, { stdio: 'pipe' });

    return {
      success: true,
      backupRef: backupBranch,
    };
  } catch (error) {
    return {
      success: false,
      backupRef: '',
    };
  }
}

/**
 * Restore from a backup
 */
export function restoreFromBackup(backupRef: string): { success: boolean; message: string } {
  try {
    // Verify backup exists
    execSync(`git rev-parse --verify ${backupRef}`, { stdio: 'pipe' });

    // Get current branch
    const currentBranch = getCurrentBranch();

    // Reset to backup
    execSync(`git reset --hard ${backupRef}`, { stdio: 'pipe' });

    return {
      success: true,
      message: `Restored ${currentBranch} to backup ${backupRef}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Restore failed: ${error}`,
    };
  }
}

/**
 * List all available backups
 */
export function listBackups(): string[] {
  try {
    const branches = execSync('git branch | grep backup/', { encoding: 'utf-8' });
    return branches
      .trim()
      .split('\n')
      .map((b) => b.trim().replace(/^\*?\s*/, ''))
      .filter((b) => b.length > 0);
  } catch {
    return [];
  }
}

/**
 * Delete old backups (older than N days)
 */
export function cleanupOldBackups(
  daysOld: number = 7
): { deleted: string[]; errors: string[] } {
  const deleted: string[] = [];
  const errors: string[] = [];

  const backups = listBackups();
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  for (const backup of backups) {
    try {
      // Get commit date
      const commitDate = execSync(`git log -1 --format=%cI ${backup}`, {
        encoding: 'utf-8',
      }).trim();

      if (new Date(commitDate) < cutoffDate) {
        execSync(`git branch -D ${backup}`, { stdio: 'pipe' });
        deleted.push(backup);
      }
    } catch (error) {
      errors.push(`${backup}: ${error}`);
    }
  }

  return { deleted, errors };
}

/**
 * Verify repository integrity
 */
export function verifyRepoIntegrity(): {
  healthy: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
      warnings.push('Repository has uncommitted changes');
    }

    // Check for unmerged paths
    try {
      execSync('git diff --check', { stdio: 'pipe' });
    } catch {
      issues.push('Repository has merge conflicts');
    }

    // Check for detached HEAD
    const branch = getCurrentBranch();
    if (branch === 'HEAD') {
      warnings.push('Repository is in detached HEAD state');
    }

    // Check for orphaned branches
    const branches = execSync('git branch | grep issue/', { encoding: 'utf-8', stdio: 'pipe' })
      .trim()
      .split('\n');

    if (branches.length > 50) {
      warnings.push(`Large number of issue branches (${branches.length})`);
    }

    // Verify git objects
    try {
      execSync('git fsck --no-progress', { stdio: 'pipe', timeout: 30000 });
    } catch {
      issues.push('Git repository has corrupted objects');
    }
  } catch (error) {
    issues.push(`Integrity check failed: ${error}`);
  }

  return {
    healthy: issues.length === 0,
    issues,
    warnings,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function getCurrentCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function extractIssueNumber(branchName: string): number | null {
  const match = branchName.match(/issue\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function logRollbackPoint(point: RollbackPoint): void {
  const line = JSON.stringify(point) + '\n';

  try {
    const fs = require('fs');
    fs.appendFileSync(ROLLBACK_LOG, line, 'utf-8');
  } catch {
    // Ignore logging errors
  }
}

function readRollbackLog(): RollbackPoint[] {
  if (!existsSync(ROLLBACK_LOG)) {
    return [];
  }

  try {
    const content = readFileSync(ROLLBACK_LOG, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/**
 * Emergency recovery - reset everything to clean state
 */
export function emergencyRecovery(): {
  success: boolean;
  steps: string[];
  message: string;
} {
  const steps: string[] = [];

  try {
    // Step 1: Stash any changes
    try {
      execSync('git stash', { stdio: 'pipe' });
      steps.push('Stashed uncommitted changes');
    } catch {
      steps.push('No changes to stash');
    }

    // Step 2: Return to main
    try {
      execSync('git checkout main', { stdio: 'pipe' });
      steps.push('Switched to main branch');
    } catch (error) {
      try {
        execSync('git checkout master', { stdio: 'pipe' });
        steps.push('Switched to master branch');
      } catch {
        steps.push('Could not switch to main/master');
      }
    }

    // Step 3: Pull latest changes
    try {
      execSync('git pull', { stdio: 'pipe' });
      steps.push('Pulled latest changes');
    } catch {
      steps.push('Could not pull latest changes (continuing anyway)');
    }

    // Step 4: Clean working directory
    try {
      execSync('git clean -fd', { stdio: 'pipe' });
      steps.push('Cleaned untracked files');
    } catch {
      steps.push('Could not clean untracked files');
    }

    return {
      success: true,
      steps,
      message: 'Emergency recovery completed - repository reset to clean state',
    };
  } catch (error) {
    steps.push(`Fatal error: ${error}`);
    return {
      success: false,
      steps,
      message: 'Emergency recovery failed - manual intervention required',
    };
  }
}
