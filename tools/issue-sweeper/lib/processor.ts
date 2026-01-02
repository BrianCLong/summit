/**
 * Core issue processing logic with automated fixing
 */

import { GitHubIssue, LedgerEntry, ProcessingResult, SolvedStatus } from './types.js';
import { GitHubClient } from './github.js';
import { classifyIssue } from './classifier.js';
import { searchForEvidence } from './evidence.js';
import { attemptFix, commitFix } from './fixer.js';
import { createPullRequest, linkPRToIssue, findExistingPR, getCurrentBranch, switchToMainBranch } from './pr-automation.js';
import { runQuickVerification } from './verifier.js';

export interface ProcessingOptions {
  autoFix?: boolean;
  autoPR?: boolean;
  skipVerification?: boolean;
}

/**
 * Process a single issue through the decision pipeline with automated fixing
 */
export async function processIssue(
  issue: GitHubIssue,
  githubClient: GitHubClient,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const { autoFix = false, autoPR = false, skipVerification = false } = options;

  console.log(`\n📋 Processing issue #${issue.number}: ${issue.title}`);

  // Step 1: Classify the issue
  const classification = classifyIssue(issue);
  console.log(`   Classification: ${classification}`);

  // Step 2: Check if PR already exists
  const existingPR = await findExistingPR(issue.number);
  if (existingPR) {
    console.log(`   ✅ PR already exists: ${existingPR}`);
    return {
      issue,
      classification,
      solved_status: 'already_solved',
      evidence: {
        prs: [existingPR],
        notes: 'PR already exists for this issue',
      },
      actions: ['found_existing_pr'],
      pr_url: existingPR,
    };
  }

  // Step 3: Search for evidence of resolution
  const { isSolved, evidence } = await searchForEvidence(issue, githubClient);

  let solved_status: SolvedStatus;
  const actions: string[] = [];
  let pr_url: string | undefined;

  if (isSolved) {
    solved_status = 'already_solved';
    console.log(`   ✅ Already solved: ${evidence.notes}`);

    // Add comment to issue with evidence
    try {
      const comment = buildEvidenceComment(issue, evidence);
      await githubClient.createComment(issue.number, comment);
      actions.push('commented_with_evidence');
      console.log(`   💬 Added evidence comment`);
    } catch (error) {
      console.warn(`   ⚠️  Failed to add comment: ${error}`);
    }

    // Close if still open
    if (issue.state === 'open') {
      try {
        await githubClient.closeIssue(issue.number);
        actions.push('closed');
        console.log(`   🔒 Closed issue`);
      } catch (error) {
        console.warn(`   ⚠️  Failed to close issue: ${error}`);
      }
    }
  } else {
    // Issue is not solved - attempt to fix it
    if (classification === 'question') {
      solved_status = 'blocked';
      evidence.notes = 'Requires clarification from reporter.';
      console.log(`   ⏸️  Blocked: Question requires clarification`);
    } else if (classification === 'security') {
      solved_status = 'blocked';
      evidence.notes = 'Security issue requires careful review and responsible disclosure.';
      console.log(`   🔐 Blocked: Security issue requires manual review`);
    } else if (autoFix) {
      // Attempt automated fix
      console.log(`   🤖 Attempting automated fix...`);

      const currentBranch = getCurrentBranch();

      try {
        const fixResult = await attemptFix(issue, classification);

        if (fixResult.success && fixResult.changes.length > 0) {
          console.log(`   ✅ Fix applied successfully`);
          evidence.notes = `Automated fix applied: ${fixResult.changes.join(', ')}`;
          evidence.files = fixResult.changes;

          // Verify the fix
          let verificationPassed = true;
          if (!skipVerification) {
            const verifyResult = await runQuickVerification();
            verificationPassed = verifyResult.passed;
            evidence.verification_command = 'pnpm typecheck && pnpm lint';
          }

          if (verificationPassed) {
            // Commit the fix
            commitFix(issue, fixResult.changes);
            actions.push('committed_fix');

            // Create PR if enabled
            if (autoPR && fixResult.branch_name) {
              try {
                pr_url = await createPullRequest({
                  branchName: fixResult.branch_name,
                  issue,
                  changes: fixResult.changes,
                  verificationCommand: fixResult.verification_command,
                });

                evidence.prs = [pr_url];
                actions.push('created_pr');
                solved_status = 'solved_in_this_run';

                // Link PR to issue
                await linkPRToIssue(issue.number, pr_url);
                actions.push('linked_pr_to_issue');
              } catch (error) {
                console.warn(`   ⚠️  Failed to create PR: ${error}`);
                solved_status = 'not_solved';
                evidence.notes += ` (PR creation failed: ${error})`;
              }
            } else {
              solved_status = 'solved_in_this_run';
              evidence.notes += ' (committed but PR not created)';
            }

            // Switch back to original branch
            switchToMainBranch(currentBranch);
          } else {
            console.log(`   ❌ Verification failed after fix`);
            solved_status = 'not_solved';
            evidence.notes = 'Fix applied but verification failed';
            actions.push('fix_failed_verification');

            // Switch back and clean up
            switchToMainBranch(currentBranch);
          }
        } else {
          console.log(`   ⚠️  No automated fix available: ${fixResult.error}`);
          solved_status = 'not_solved';
          evidence.notes = fixResult.error || 'No automated fix available';

          // Switch back to original branch
          switchToMainBranch(currentBranch);
        }
      } catch (error) {
        console.error(`   ❌ Error during fix attempt: ${error}`);
        solved_status = 'not_solved';
        evidence.notes = `Fix attempt failed: ${error}`;

        // Ensure we switch back to original branch
        try {
          switchToMainBranch(currentBranch);
        } catch {
          // Ignore errors during cleanup
        }
      }
    } else {
      // Auto-fix not enabled
      solved_status = 'not_solved';
      evidence.notes = 'Identified as actionable but auto-fix not enabled.';
      console.log(`   📝 Not solved: Auto-fix disabled`);
    }
  }

  return {
    issue,
    classification,
    solved_status,
    evidence,
    actions,
    pr_url,
  };
}

/**
 * Build an evidence comment for an already-solved issue
 */
function buildEvidenceComment(issue: GitHubIssue, evidence: any): string {
  let comment = `## ✅ Issue Resolution Evidence\n\n`;
  comment += `This issue appears to have been resolved.\n\n`;

  if (evidence.prs && evidence.prs.length > 0) {
    comment += `### Related PRs\n\n`;
    comment += evidence.prs.map((pr: string) => `- ${pr}`).join('\n');
    comment += `\n\n`;
  }

  if (evidence.commits && evidence.commits.length > 0) {
    comment += `### Related Commits\n\n`;
    comment += '```\n';
    comment += evidence.commits.join('\n');
    comment += '\n```\n\n';
  }

  if (evidence.notes) {
    comment += `### Notes\n\n${evidence.notes}\n\n`;
  }

  comment += `---\n`;
  comment += `*This comment was automatically generated by the issue sweeper.*\n`;

  return comment;
}

/**
 * Convert a ProcessingResult to a LedgerEntry
 */
export function resultToLedgerEntry(result: ProcessingResult): LedgerEntry {
  return {
    issue_number: result.issue.number,
    title: result.issue.title,
    state: result.issue.state,
    classification: result.classification,
    solved_status: result.solved_status,
    evidence: result.evidence,
    actions_taken: result.actions,
    verification: result.evidence.verification_command,
    processed_at: new Date().toISOString(),
  };
}
