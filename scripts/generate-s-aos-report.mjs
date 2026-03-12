#!/usr/bin/env node

/**
 * S-AOS Automated Report Generator
 *
 * Generates comprehensive S-AOS compliance reports for management and board review.
 * Analyzes commits, PRs, audit trails, and evidence artifacts to produce
 * actionable insights and compliance metrics.
 *
 * Usage: node scripts/generate-s-aos-report.mjs [--period=7d] [--format=markdown|json|html]
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Configuration
const PERIOD_DAYS = parseInt(process.argv.find(arg => arg.startsWith('--period='))?.split('=')[1] || '7', 10);
const FORMAT = process.argv.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'markdown';
const OUTPUT_DIR = 'reports/s-aos';

// ============================================================================
// Data Collection
// ============================================================================

async function collectGitMetrics() {
  const since = `${PERIOD_DAYS} days ago`;

  try {
    // Total commits
    const { stdout: totalCommits } = await execAsync(
      `git log --since="${since}" --oneline | wc -l`
    );

    // S-AOS formatted commits
    const { stdout: compliantCommits } = await execAsync(
      `git log --since="${since}" --oneline --grep="^(feat|fix|docs|chore|refactor|test|perf|ci|build|style)(" | wc -l`
    );

    // Unique authors
    const { stdout: authors } = await execAsync(
      `git log --since="${since}" --format="%ae" | sort | uniq | wc -l`
    );

    // Commits by type
    const types = {};
    for (const type of ['feat', 'fix', 'docs', 'chore', 'refactor', 'test']) {
      const { stdout } = await execAsync(
        `git log --since="${since}" --oneline --grep="^${type}(" | wc -l`
      );
      types[type] = parseInt(stdout.trim(), 10);
    }

    return {
      totalCommits: parseInt(totalCommits.trim(), 10),
      compliantCommits: parseInt(compliantCommits.trim(), 10),
      uniqueAuthors: parseInt(authors.trim(), 10),
      typeBreakdown: types,
      complianceRate: parseInt(compliantCommits.trim(), 10) / parseInt(totalCommits.trim(), 10)
    };
  } catch (error) {
    console.error('Error collecting git metrics:', error.message);
    return null;
  }
}

async function collectAuditMetrics() {
  const auditFile = 'artifacts/repoos/entropy-actions/audit.json';

  try {
    const content = await fs.readFile(auditFile, 'utf-8');
    const audit = JSON.parse(content);

    // Filter by period
    const cutoff = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const recentEntries = audit.filter(entry => new Date(entry.timestamp) > cutoff);

    // Count by type
    const byType = {};
    const byStatus = {};

    for (const entry of recentEntries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    }

    return {
      totalActions: recentEntries.length,
      byType,
      byStatus,
      hasAuditTrail: true
    };
  } catch (error) {
    return {
      totalActions: 0,
      byType: {},
      byStatus: {},
      hasAuditTrail: false
    };
  }
}

async function collectPRMetrics() {
  try {
    // Get PRs from the period
    const { stdout } = await execAsync(
      `gh pr list --state all --limit 100 --json number,title,createdAt,mergedAt,state,labels --jq '.[]'`
    );

    const prs = stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));

    // Filter by period
    const cutoff = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const recentPRs = prs.filter(pr => new Date(pr.createdAt) > cutoff);

    // Analyze labels for S-AOS compliance
    const compliancePRs = recentPRs.filter(pr =>
      pr.labels?.some(l => l.name.includes('s-aos') || l.name.includes('compliance'))
    );

    return {
      totalPRs: recentPRs.length,
      mergedPRs: recentPRs.filter(pr => pr.state === 'MERGED').length,
      openPRs: recentPRs.filter(pr => pr.state === 'OPEN').length,
      compliancePRs: compliancePRs.length
    };
  } catch (error) {
    console.error('Error collecting PR metrics (gh CLI required):', error.message);
    return null;
  }
}

async function collectEvidenceMetrics() {
  const entropyReports = [];
  const resurrectionReports = [];

  try {
    // Find entropy reports
    const { stdout: entropyFiles } = await execAsync(
      'find artifacts/repoos/frontier-entropy -name "report.json" -type f 2>/dev/null || true'
    );

    if (entropyFiles.trim()) {
      for (const file of entropyFiles.trim().split('\n').filter(Boolean)) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const report = JSON.parse(content);
          entropyReports.push(report);
        } catch {}
      }
    }

    // Find resurrection reports
    const { stdout: resurrectionFiles } = await execAsync(
      'find artifacts/history-quick -name "report.json" -type f 2>/dev/null || true'
    );

    if (resurrectionFiles.trim()) {
      for (const file of resurrectionFiles.trim().split('\n').filter(Boolean)) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const report = JSON.parse(content);
          resurrectionReports.push(report);
        } catch {}
      }
    }

    return {
      entropyReportsCount: entropyReports.length,
      resurrectionReportsCount: resurrectionReports.length,
      latestEntropyF1: entropyReports[0]?.calibrationStatus?.currentF1Score || 0,
      latestResurrectionAccuracy: resurrectionReports[0]?.calibrationMetrics?.calibrationAccuracy || 0
    };
  } catch (error) {
    return {
      entropyReportsCount: 0,
      resurrectionReportsCount: 0,
      latestEntropyF1: 0,
      latestResurrectionAccuracy: 0
    };
  }
}

// ============================================================================
// Report Generation
// ============================================================================

function generateMarkdownReport(data) {
  const { git, audit, prs, evidence, timestamp } = data;

  return `# S-AOS Compliance Report

**Period**: Last ${PERIOD_DAYS} days
**Generated**: ${timestamp}

---

## Executive Summary

${git ? `
### Adoption Metrics

- **Commit Compliance Rate**: ${(git.complianceRate * 100).toFixed(1)}% (${git.compliantCommits}/${git.totalCommits} commits)
- **Active Contributors**: ${git.uniqueAuthors} developers
- **Total Commits**: ${git.totalCommits}
` : '⚠️ Git metrics unavailable'}

${prs ? `
### Pull Request Activity

- **Total PRs**: ${prs.totalPRs}
- **Merged**: ${prs.mergedPRs}
- **Open**: ${prs.openPRs}
- **S-AOS Labeled**: ${prs.compliancePRs}
` : '⚠️ PR metrics unavailable (requires gh CLI)'}

${audit ? `
### Audit Trail Health

- **Total Actions**: ${audit.totalActions}
- **Audit Trail**: ${audit.hasAuditTrail ? '✅ Active' : '❌ Not found'}
` : ''}

${evidence ? `
### Evidence Generation

- **Entropy Reports**: ${evidence.entropyReportsCount}
- **Resurrection Reports**: ${evidence.resurrectionReportsCount}
- **Latest Entropy F1**: ${(evidence.latestEntropyF1 * 100).toFixed(1)}% ${evidence.latestEntropyF1 >= 0.75 ? '✅' : evidence.latestEntropyF1 >= 0.50 ? '⚠️' : '❌'}
- **Latest Resurrection Accuracy**: ${(evidence.latestResurrectionAccuracy * 100).toFixed(1)}% ${evidence.latestResurrectionAccuracy >= 0.75 ? '✅' : evidence.latestResurrectionAccuracy >= 0.50 ? '⚠️' : '❌'}
` : ''}

---

## Detailed Metrics

${git ? `
### Commit Type Breakdown

| Type | Count | Percentage |
|------|-------|------------|
${Object.entries(git.typeBreakdown).map(([type, count]) =>
  `| ${type} | ${count} | ${(count / git.totalCommits * 100).toFixed(1)}% |`
).join('\n')}
| **Total** | **${git.totalCommits}** | **100%** |

**Compliance Rate**: ${(git.complianceRate * 100).toFixed(1)}%
` : ''}

${audit && audit.hasAuditTrail ? `
### Audit Trail Activity

**Actions by Type**:
${Object.entries(audit.byType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

**Actions by Status**:
${Object.entries(audit.byStatus).map(([status, count]) => `- ${status}: ${count}`).join('\n')}
` : ''}

---

## Health Assessment

${generateHealthAssessment(data)}

---

## Recommendations

${generateRecommendations(data)}

---

## Trends

${generateTrends(data)}

---

**Report Generated**: ${timestamp}
**Tool**: S-AOS Report Generator v1.0
**Command**: \`node scripts/generate-s-aos-report.mjs --period=${PERIOD_DAYS}d\`
`;
}

function generateHealthAssessment(data) {
  const { git, audit, evidence } = data;
  const issues = [];
  const successes = [];

  // Assess commit compliance
  if (git) {
    if (git.complianceRate >= 0.90) {
      successes.push('✅ **Excellent commit compliance** (≥90%)');
    } else if (git.complianceRate >= 0.70) {
      successes.push('⚠️ **Good commit compliance** (70-90%)');
    } else {
      issues.push('❌ **Low commit compliance** (<70%) - Need training/enforcement');
    }
  }

  // Assess audit trail
  if (audit) {
    if (audit.hasAuditTrail && audit.totalActions > 0) {
      successes.push('✅ **Audit trail active** with recent activity');
    } else if (audit.hasAuditTrail) {
      successes.push('⚠️ **Audit trail exists** but no recent activity');
    } else {
      issues.push('❌ **No audit trail** - Audit logging not configured');
    }
  }

  // Assess calibration
  if (evidence) {
    if (evidence.latestEntropyF1 >= 0.75) {
      successes.push('✅ **Entropy model calibrated** (F1 ≥ 0.75)');
    } else if (evidence.latestEntropyF1 > 0) {
      issues.push(`⚠️ **Entropy model uncalibrated** (F1 = ${(evidence.latestEntropyF1 * 100).toFixed(1)}%, target 75%)`);
    } else {
      issues.push('❌ **Entropy model not calibrated** (F1 = 0%)');
    }

    if (evidence.latestResurrectionAccuracy >= 0.75) {
      successes.push('✅ **Resurrection model calibrated** (≥75% accuracy)');
    } else if (evidence.latestResurrectionAccuracy > 0) {
      issues.push(`⚠️ **Resurrection model partially calibrated** (${(evidence.latestResurrectionAccuracy * 100).toFixed(1)}%, target 75%)`);
    }
  }

  return `
### Successes

${successes.length > 0 ? successes.join('\n') : '- No notable successes this period'}

### Issues & Warnings

${issues.length > 0 ? issues.join('\n') : '- No critical issues detected'}

### Overall Health

${issues.filter(i => i.startsWith('❌')).length === 0 ? '🟢 **HEALTHY**' : issues.filter(i => i.startsWith('❌')).length <= 2 ? '🟡 **NEEDS ATTENTION**' : '🔴 **CRITICAL ISSUES**'}
  `.trim();
}

function generateRecommendations(data) {
  const { git, audit, evidence } = data;
  const recommendations = [];

  // Commit compliance recommendations
  if (git && git.complianceRate < 0.90) {
    recommendations.push({
      priority: 'HIGH',
      item: 'Improve commit compliance',
      actions: [
        'Install git hooks: `npm run s-aos:install`',
        'Conduct S-AOS training session',
        'Share good vs bad examples with team'
      ]
    });
  }

  // Calibration recommendations
  if (evidence && evidence.latestEntropyF1 < 0.75) {
    recommendations.push({
      priority: 'HIGH',
      item: 'Calibrate entropy prediction model',
      actions: [
        'Review entropy recalibration roadmap',
        'Collect ground truth data for training',
        'Target F1 ≥ 0.75 before enabling actuation'
      ]
    });
  }

  // Audit trail recommendations
  if (!audit || !audit.hasAuditTrail) {
    recommendations.push({
      priority: 'MEDIUM',
      item: 'Enable audit logging',
      actions: [
        'Configure AUDIT_LOG_SECRET',
        'Deploy immutable audit logger',
        'Test signature verification'
      ]
    });
  }

  if (recommendations.length === 0) {
    return '✅ **No immediate actions required** - System is operating within acceptable parameters';
  }

  return recommendations.map(rec =>
    `### ${rec.priority}: ${rec.item}\n\n${rec.actions.map(a => `- ${a}`).join('\n')}`
  ).join('\n\n');
}

function generateTrends(data) {
  // Placeholder - would need historical data
  return `
_Trend analysis requires multiple report periods. Generate reports weekly to track trends over time._

**Next Steps**:
- Run this report weekly: \`node scripts/generate-s-aos-report.mjs --period=7d\`
- Archive reports to \`reports/s-aos/YYYY-MM-DD.md\`
- Compare week-over-week metrics
  `.trim();
}

function generateJSONReport(data) {
  return JSON.stringify({
    ...data,
    summary: {
      complianceScore: calculateOverallScore(data),
      health: assessOverallHealth(data),
      criticalIssues: countCriticalIssues(data)
    }
  }, null, 2);
}

function calculateOverallScore(data) {
  let score = 0;
  let weights = 0;

  if (data.git) {
    score += data.git.complianceRate * 40;
    weights += 40;
  }

  if (data.audit && data.audit.hasAuditTrail) {
    score += 20;
    weights += 20;
  }

  if (data.evidence) {
    score += (data.evidence.latestEntropyF1 >= 0.75 ? 20 : data.evidence.latestEntropyF1 * 20);
    score += (data.evidence.latestResurrectionAccuracy >= 0.75 ? 20 : data.evidence.latestResurrectionAccuracy * 20);
    weights += 40;
  }

  return weights > 0 ? Math.round((score / weights) * 100) : 0;
}

function assessOverallHealth(data) {
  const criticalIssues = countCriticalIssues(data);

  if (criticalIssues === 0) return 'HEALTHY';
  if (criticalIssues <= 2) return 'NEEDS_ATTENTION';
  return 'CRITICAL';
}

function countCriticalIssues(data) {
  let issues = 0;

  if (data.git && data.git.complianceRate < 0.70) issues++;
  if (data.evidence && data.evidence.latestEntropyF1 < 0.50) issues++;
  if (!data.audit || !data.audit.hasAuditTrail) issues++;

  return issues;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`\n📊 Generating S-AOS Report (last ${PERIOD_DAYS} days)...\n`);

  // Collect data
  console.log('Collecting git metrics...');
  const git = await collectGitMetrics();

  console.log('Collecting audit metrics...');
  const audit = await collectAuditMetrics();

  console.log('Collecting PR metrics...');
  const prs = await collectPRMetrics();

  console.log('Collecting evidence metrics...');
  const evidence = await collectEvidenceMetrics();

  const data = {
    period: `${PERIOD_DAYS} days`,
    timestamp: new Date().toISOString(),
    git,
    audit,
    prs,
    evidence
  };

  // Generate report
  console.log('\nGenerating report...\n');

  let report;
  let filename;

  if (FORMAT === 'json') {
    report = generateJSONReport(data);
    filename = `s-aos-report-${new Date().toISOString().split('T')[0]}.json`;
  } else {
    report = generateMarkdownReport(data);
    filename = `s-aos-report-${new Date().toISOString().split('T')[0]}.md`;
  }

  // Save report
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, filename);
  await fs.writeFile(outputPath, report);

  console.log(`✅ Report saved: ${outputPath}\n`);

  // Print summary
  if (FORMAT === 'markdown') {
    console.log('Summary:');
    if (git) {
      console.log(`  Commit Compliance: ${(git.complianceRate * 100).toFixed(1)}%`);
    }
    if (audit) {
      console.log(`  Audit Trail: ${audit.hasAuditTrail ? '✅ Active' : '❌ Not found'}`);
    }
    console.log(`  Overall Score: ${calculateOverallScore(data)}/100`);
    console.log(`  Health: ${assessOverallHealth(data)}\n`);
  }

  console.log('Done!\n');
}

main().catch(error => {
  console.error('Report generation failed:', error);
  process.exit(1);
});
