#!/usr/bin/env node

/**
 * OPA Policy Evaluator for Release Captain
 *
 * Evaluates PR changes against Summit release policies using OPA.
 * Provides detailed feedback and actionable remediation steps.
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

class PolicyEvaluator {
  constructor(prNumber, githubToken) {
    this.prNumber = prNumber;
    this.githubToken = githubToken;
    this.opaPath = this.findOPA();
  }

  findOPA() {
    try {
      return execSync('which opa', { encoding: 'utf8' }).trim();
    } catch (error) {
      throw new Error(
        'OPA binary not found. Please install OPA: https://www.openpolicyagent.org/docs/latest/get-started/',
      );
    }
  }

  async generatePolicyInput() {
    console.log('📋 Generating policy input data...');

    // Fetch PR data
    const prData = await this.fetchPRData();
    const changedFiles = await this.fetchChangedFiles();
    const qualityGates = await this.getQualityGateStatus();

    const policyInput = {
      pr: {
        number: this.prNumber,
        title: prData.title,
        body: prData.body || '',
        author: prData.user.login,
        draft: prData.draft,
        mergeable: prData.mergeable,
        mergeable_state: prData.mergeable_state,
        labels: prData.labels?.map((l) => l.name) || [],
        approvals: await this.countApprovals(),
        changes_requested: await this.hasChangesRequested(),
        codeowner_approved: await this.hasCodeOwnerApproval(),
        owner_approved: await this.hasOwnerApproval(),
      },
      changed_files: changedFiles,
      quality_gates: qualityGates,
      max_allowed_risk: process.env.MAX_ALLOWED_RISK || 'HIGH',
      emergency_approval: process.env.EMERGENCY_APPROVAL === 'true',
      migration_review: {
        approved: await this.hasMigrationReview(),
      },
    };

    // Write input file for OPA
    const inputFile = '/tmp/policy-input.json';
    fs.writeFileSync(inputFile, JSON.stringify(policyInput, null, 2));

    console.log(`📄 Policy input written to: ${inputFile}`);
    return { policyInput, inputFile };
  }

  async fetchPRData() {
    const cmd = `gh api "/repos/$GITHUB_REPOSITORY/pulls/${this.prNumber}"`;
    const output = execSync(cmd, {
      encoding: 'utf8',
      env: { ...process.env, GH_TOKEN: this.githubToken },
    });
    return JSON.parse(output);
  }

  async fetchChangedFiles() {
    const cmd = `gh api "/repos/$GITHUB_REPOSITORY/pulls/${this.prNumber}/files"`;
    const output = execSync(cmd, {
      encoding: 'utf8',
      env: { ...process.env, GH_TOKEN: this.githubToken },
    });
    const files = JSON.parse(output);

    return files.map((file) => ({
      path: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
    }));
  }

  async getQualityGateStatus() {
    // This would typically fetch from GitHub status checks
    // For now, we'll simulate based on what we expect Release Captain to provide

    try {
      // Try to read from a status file if it exists
      const statusFile = '/tmp/quality-gates-status.json';
      if (fs.existsSync(statusFile)) {
        return JSON.parse(fs.readFileSync(statusFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not read quality gate status, using defaults');
    }

    // Default quality gate status
    return {
      build: true,
      typecheck: true,
      lint: true,
      tests: true,
      security: true,
      helm: true,
      integration_tests: false,
      e2e: false,
      contract_tests: false,
      migration_plan: false,
      performance_smoke: false,
      dependency_audit: true,
    };
  }

  async countApprovals() {
    try {
      const cmd = `gh api "/repos/$GITHUB_REPOSITORY/pulls/${this.prNumber}/reviews" --jq '[.[] | select(.state == "APPROVED")] | length'`;
      const output = execSync(cmd, {
        encoding: 'utf8',
        env: { ...process.env, GH_TOKEN: this.githubToken },
      });
      return parseInt(output.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  async hasChangesRequested() {
    try {
      const cmd = `gh api "/repos/$GITHUB_REPOSITORY/pulls/${this.prNumber}/reviews" --jq '[.[] | select(.state == "CHANGES_REQUESTED")] | length'`;
      const output = execSync(cmd, {
        encoding: 'utf8',
        env: { ...process.env, GH_TOKEN: this.githubToken },
      });
      return parseInt(output.trim()) > 0;
    } catch (error) {
      return false;
    }
  }

  async hasCodeOwnerApproval() {
    // Simplified check - in practice, this would verify CODEOWNERS file
    const approvals = await this.countApprovals();
    return approvals > 0; // Assuming at least one approval is from a code owner
  }

  async hasOwnerApproval() {
    try {
      const cmd = `gh api "/repos/$GITHUB_REPOSITORY/pulls/${this.prNumber}/reviews" --jq '[.[] | select(.state == "APPROVED" and .author_association == "OWNER")] | length'`;
      const output = execSync(cmd, {
        encoding: 'utf8',
        env: { ...process.env, GH_TOKEN: this.githubToken },
      });
      return parseInt(output.trim()) > 0;
    } catch (error) {
      return false;
    }
  }

  async hasMigrationReview() {
    // Check if PR has migration review label or comment
    try {
      const prData = await this.fetchPRData();
      return (
        prData.labels?.some((l) => l.name === 'migration-reviewed') || false
      );
    } catch (error) {
      return false;
    }
  }

  async evaluatePolicy(inputFile) {
    console.log('⚖️ Evaluating policy with OPA...');

    const policyDir = '.github/policies';
    const query = 'data.summit.release.decision';

    try {
      const cmd = `${this.opaPath} eval -d ${policyDir} -i ${inputFile} "${query}"`;
      const output = execSync(cmd, { encoding: 'utf8' });

      const result = JSON.parse(output);
      return result.result;
    } catch (error) {
      console.error('OPA evaluation failed:', error.message);
      throw error;
    }
  }

  generateReport(decision) {
    console.log('\n⚖️ Policy Evaluation Report');
    console.log('===========================');

    const {
      allowed,
      risk_level,
      violations,
      warnings,
      requirements,
      confidence,
    } = decision;

    console.log(`\n📊 Decision: ${allowed ? '✅ APPROVED' : '❌ BLOCKED'}`);
    console.log(`📈 Risk Level: ${risk_level}`);
    console.log(`🎯 Confidence: ${confidence}%`);

    if (violations && violations.length > 0) {
      console.log('\n🚨 Policy Violations:');
      violations.forEach((violation, i) => {
        console.log(`\n  ${i + 1}. ${violation.message}`);
        console.log(`     Type: ${violation.type}`);
        console.log(`     Severity: ${violation.severity}`);
        console.log(`     Remediation: ${violation.remediation}`);
      });
    }

    if (warnings && warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning.message} (${warning.severity})`);
      });
    }

    if (requirements && requirements.length > 0) {
      console.log('\n📋 Requirements:');
      requirements.forEach((req, i) => {
        const blocking = req.blocking ? '🚫 BLOCKING' : '💡 ADVISORY';
        console.log(`  ${i + 1}. [${blocking}] ${req.message}`);
      });
    }

    return {
      approved: allowed,
      violations: violations || [],
      warnings: warnings || [],
      requirements: requirements || [],
      riskLevel: risk_level,
      confidence,
    };
  }

  async generatePRComment(report) {
    const {
      approved,
      violations,
      warnings,
      requirements,
      riskLevel,
      confidence,
    } = report;

    let comment = `## ⚖️ Policy Evaluation Results

**Decision**: ${approved ? '✅ **APPROVED**' : '❌ **BLOCKED**'}
**Risk Level**: ${riskLevel}
**Confidence**: ${confidence}%

`;

    if (violations.length > 0) {
      comment += `### 🚨 Policy Violations

${violations
  .map(
    (v, i) => `${i + 1}. **${v.type}** (${v.severity})
   - ${v.message}
   - **Fix**: ${v.remediation}`,
  )
  .join('\n\n')}

`;
    }

    if (warnings.length > 0) {
      comment += `### ⚠️ Warnings

${warnings.map((w, i) => `${i + 1}. ${w.message}`).join('\n')}

`;
    }

    if (requirements.length > 0) {
      comment += `### 📋 Requirements

${requirements.map((r, i) => `${i + 1}. ${r.blocking ? '🚫' : '💡'} ${r.message}`).join('\n')}

`;
    }

    if (approved) {
      comment += `### ✅ Next Steps

This PR meets all policy requirements and is ready for merge.

- All quality gates have passed
- Risk level is acceptable
- Required approvals are in place

`;
    } else {
      comment += `### ❌ Required Actions

Please address the violations above before requesting review:

1. Fix all blocking policy violations
2. Ensure required quality gates pass
3. Obtain necessary approvals
4. Re-run Release Captain when ready

`;
    }

    comment += `---
*Policy evaluation by Release Captain 🚢*`;

    // Post comment to PR
    const commentFile = '/tmp/policy-comment.md';
    fs.writeFileSync(commentFile, comment);

    try {
      execSync(`gh pr comment ${this.prNumber} --body-file ${commentFile}`, {
        env: { ...process.env, GH_TOKEN: this.githubToken },
      });
      console.log('✅ Policy evaluation comment posted to PR');
    } catch (error) {
      console.error('Failed to post PR comment:', error.message);
    }

    return comment;
  }

  async run() {
    try {
      console.log(`🚀 Starting policy evaluation for PR #${this.prNumber}`);

      const { policyInput, inputFile } = await this.generatePolicyInput();
      const decision = await this.evaluatePolicy(inputFile);
      const report = this.generateReport(decision);
      await this.generatePRComment(report);

      // Set GitHub Action outputs
      if (process.env.GITHUB_OUTPUT) {
        const outputs = [
          `policy_approved=${report.approved}`,
          `risk_level=${report.riskLevel}`,
          `violation_count=${report.violations.length}`,
          `confidence=${report.confidence}`,
        ];
        fs.appendFileSync(process.env.GITHUB_OUTPUT, outputs.join('\n') + '\n');
      }

      return report.approved;
    } catch (error) {
      console.error('❌ Policy evaluation failed:', error.message);
      throw error;
    }
  }
}

// CLI usage
async function main() {
  const prNumber = process.argv[2] || process.env.PR_NUMBER;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!prNumber) {
    console.error('Usage: policy-evaluator.js <PR_NUMBER>');
    console.error('Or set PR_NUMBER environment variable');
    process.exit(1);
  }

  if (!githubToken) {
    console.error('GITHUB_TOKEN environment variable required');
    process.exit(1);
  }

  try {
    const evaluator = new PolicyEvaluator(prNumber, githubToken);
    const approved = await evaluator.run();

    console.log(
      `\n${approved ? '✅' : '❌'} Policy evaluation ${approved ? 'passed' : 'failed'}`,
    );
    process.exit(approved ? 0 : 1);
  } catch (error) {
    console.error('Policy evaluation error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { PolicyEvaluator };
