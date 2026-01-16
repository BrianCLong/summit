#!/usr/bin/env node
/**
 * sync_stabilization_roadmap_handoff.mjs
 *
 * Generates roadmap handoff drafts from selected candidates and optionally
 * syncs them to GitHub issues for triage and tracking.
 *
 * Usage:
 *   node scripts/releases/sync_stabilization_roadmap_handoff.mjs [OPTIONS]
 *
 * Options:
 *   --candidates=PATH   Path to candidates JSON (required)
 *   --retro=PATH        Path to retrospective JSON (required)
 *   --out-dir=PATH      Output directory (default: artifacts/stabilization/roadmap-handoff)
 *   --mode=MODE         Operation mode: draft|apply (default: draft)
 *   --github-token=TOKEN GitHub token for issue creation (required for apply mode)
 *   --help              Show this help message
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '../..');

// Parse CLI arguments
function parseArgs() {
  const args = {
    candidates: null,
    retro: null,
    outDir: join(REPO_ROOT, 'artifacts/stabilization/roadmap-handoff'),
    mode: 'draft',
    githubToken: process.env.GITHUB_TOKEN || null,
    help: false
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--help') {
      args.help = true;
    } else if (arg.startsWith('--candidates=')) {
      args.candidates = arg.split('=')[1];
    } else if (arg.startsWith('--retro=')) {
      args.retro = arg.split('=')[1];
    } else if (arg.startsWith('--out-dir=')) {
      args.outDir = arg.split('=')[1];
    } else if (arg.startsWith('--mode=')) {
      args.mode = arg.split('=')[1];
    } else if (arg.startsWith('--github-token=')) {
      args.githubToken = arg.split('=')[1];
    }
  }

  return args;
}

// Generate draft markdown for a candidate
function generateCandidateDraft(candidate, retro) {
  const { slug, title, category, severity, persistence, trigger, evidence } = candidate;

  const window = `${retro.window.start?.split('T')[0]} to ${retro.window.end?.split('T')[0]}`;
  const weekCount = retro.window.weeks;

  let md = `# ${title}

**Slug:** \`${slug}\`
**Category:** ${category}
**Severity:** ${severity}
**Status:** Draft

---

## Problem Statement

`;

  // Tailor problem statement to the slug
  switch (slug) {
    case 'issuance-hygiene':
      md += `Blocked P0 items remain unissued across multiple weeks, indicating a systemic gap in issue tracking and governance. This prevents proper SLA tracking and accountability.

**Evidence:**
- Weeks affected: ${evidence.weeks_affected}/${evidence.total_weeks}
- Latest blocked & unissued P0 count: ${evidence.latest_value}
- Trigger: \`${trigger}\`
`;
      break;

    case 'evidence-compliance':
      md += `Evidence collection compliance has fallen below target thresholds, risking audit failures and compliance violations.

**Evidence:**
- Average compliance: ${(evidence.average_compliance * 100).toFixed(1)}%
- Target compliance: ${(evidence.target * 100).toFixed(1)}%
- Weeks below target: ${evidence.weeks_affected}/${evidence.total_weeks}
- Trigger: \`${trigger}\`
`;
      break;

    case 'p0-sla-adherence':
      md += `P0 items persistently miss SLA targets across multiple weeks, indicating process bottlenecks or resource constraints.

**Evidence:**
- Weeks with overdue P0s: ${evidence.weeks_affected}/${evidence.total_weeks}
- Latest overdue P0 count: ${evidence.latest_value}
- Trigger: \`${trigger}\`
`;
      break;

    case 'systemic-risk-reduction':
      md += `The stabilization risk index remains elevated, indicating systemic technical debt or architectural concerns requiring attention.

**Evidence:**
- Average risk index: ${evidence.average_risk_index?.toFixed(1)}
- Trend: ${evidence.trend}
- Threshold: ${evidence.threshold}
- Latest value: ${evidence.latest_value}
- Trigger: \`${trigger}\`
`;
      break;

    case 'on-time-delivery':
      md += `On-time delivery rates fall below acceptable thresholds, impacting release predictability and stakeholder confidence.

**Evidence:**
- Average on-time rate: ${(evidence.average_on_time_rate * 100).toFixed(1)}%
- Target: ${(evidence.target * 100).toFixed(1)}%
- Latest value: ${(evidence.latest_value * 100).toFixed(1)}%
- Trigger: \`${trigger}\`
`;
      break;

    case 'ci-gate-stability':
      md += `Recurring CI/CD gate failures disrupt development velocity and create uncertainty in release readiness.

**Evidence:**
- Recurring issues: ${evidence.recurring_issues?.join(', ') || 'N/A'}
- Weeks affected: ${evidence.weeks_affected}
- Trigger: \`${trigger}\`
`;
      break;

    default:
      md += `Metrics indicate a recurring systemic issue requiring process or technical improvements.

**Evidence:**
- Metric: ${evidence.metric}
- Trigger: \`${trigger}\`
`;
  }

  md += `

**Time Window:** ${window} (${weekCount} weeks)

---

## Evidence Citations

- **Retrospective:** \`${retro.window.start}\` to \`${retro.window.end}\`
- **Artifacts:** Weekly stabilization closeout reports
- **Key Metric:** \`${evidence.metric}\`

---

## Proposed Scope

This is a **systemic fix**, not a feature request. The scope should focus on:

`;

  // Tailor proposed scope to the slug
  switch (slug) {
    case 'issuance-hygiene':
      md += `1. **Automated Issue Creation:** Implement automation to create GitHub issues for blocked P0 items immediately when identified
2. **SLA Tracking:** Add SLA start/end timestamps to issue metadata for accurate tracking
3. **Governance Dashboard:** Surface blocked-but-unissued items prominently in dashboards
4. **Process Documentation:** Document clear escalation paths for blocked items
`;
      break;

    case 'evidence-compliance':
      md += `1. **Automated Evidence Collection:** Expand automation coverage for evidence gathering
2. **Compliance Gates:** Add CI gates to block releases when evidence is insufficient
3. **Documentation:** Create runbooks for manual evidence collection where automation is infeasible
4. **Monitoring:** Add alerts when compliance drops below thresholds
`;
      break;

    case 'p0-sla-adherence':
      md += `1. **Root Cause Analysis:** Identify common causes of P0 SLA misses (resource constraints, dependencies, etc.)
2. **Process Optimization:** Streamline approval/review processes for P0 items
3. **Capacity Planning:** Ensure adequate on-call/triage capacity for P0 response
4. **Escalation Automation:** Auto-escalate P0s approaching SLA deadline
`;
      break;

    case 'systemic-risk-reduction':
      md += `1. **Technical Debt Inventory:** Catalog high-risk areas contributing to risk index
2. **Mitigation Plan:** Prioritize technical debt reduction efforts
3. **Architecture Review:** Identify architectural improvements to reduce systemic risk
4. **Guardrails:** Implement additional guardrails or tests to prevent risk accumulation
`;
      break;

    case 'on-time-delivery':
      md += `1. **Bottleneck Analysis:** Identify common causes of delays (reviews, CI, dependencies)
2. **Process Streamlining:** Remove unnecessary process overhead
3. **Resource Allocation:** Ensure adequate reviewer/approver bandwidth
4. **Predictability Improvements:** Better estimation or reduced scope creep
`;
      break;

    case 'ci-gate-stability':
      md += `1. **Flaky Test Remediation:** Identify and fix or quarantine flaky tests
2. **Infrastructure Stability:** Address CI infrastructure issues (timeouts, resource limits)
3. **Gate Optimization:** Optimize slow gates to reduce cycle time
4. **Monitoring:** Add monitoring and alerting for gate health
`;
      break;

    default:
      md += `1. Identify root causes of the recurring issue
2. Implement systemic fixes (automation, process, or technical)
3. Add monitoring and alerting to prevent recurrence
4. Document lessons learned
`;
  }

  md += `
---

## Acceptance Criteria

Success will be measured by movement in the following metrics:

`;

  // Tailor acceptance criteria to the slug
  switch (slug) {
    case 'issuance-hygiene':
      md += `- [ ] \`blocked_unissued_p0\` = 0 for 4 consecutive weeks
- [ ] Automation creates issues within 1 hour of P0 being blocked
- [ ] 100% of P0s have SLA timestamps in metadata
`;
      break;

    case 'evidence-compliance':
      md += `- [ ] \`evidence_compliance\` >= 95% for 4 consecutive weeks
- [ ] CI gate rejects releases with <95% compliance
- [ ] Evidence collection failures auto-alert within 15 minutes
`;
      break;

    case 'p0-sla-adherence':
      md += `- [ ] \`overdue_p0\` = 0 for 4 consecutive weeks
- [ ] P0 SLA adherence rate >= 95%
- [ ] Auto-escalation triggers 24 hours before SLA breach
`;
      break;

    case 'systemic-risk-reduction':
      md += `- [ ] \`risk_index\` < 25 (sustained for 4 weeks)
- [ ] Technical debt backlog prioritized and tracked
- [ ] Architecture review completed and remediation plan approved
`;
      break;

    case 'on-time-delivery':
      md += `- [ ] \`on_time_rate\` >= 80% for 4 consecutive weeks
- [ ] Bottleneck analysis completed and mitigations implemented
- [ ] Average PR review time < 24 hours
`;
      break;

    case 'ci-gate-stability':
      md += `- [ ] CI gate pass rate >= 95% for 4 consecutive weeks
- [ ] Zero recurring flaky test failures
- [ ] CI infrastructure SLA >= 99.5%
`;
      break;

    default:
      md += `- [ ] Relevant metrics show sustained improvement over 4 weeks
- [ ] No recurrence of the issue in retrospective analysis
`;
  }

  md += `
---

## Risks & Dependencies

**Risks:**
- Implementation may require cross-team coordination
- Automation changes may need testing and gradual rollout
- Scope creep if not tightly scoped to systemic fixes

**Dependencies:**
- Existing CI/CD infrastructure
- GitHub API access and automation tooling
- Team bandwidth for implementation

---

## Owner & Routing

**Status:** \`needs-triage\`
**Owner:** TBD
**Labels:** \`roadmap\`, \`stabilization\`, \`${category}\`, \`severity:${severity}\`

---

**Generated:** ${new Date().toISOString()}
**Stabilization Roadmap Candidate Marker:** \`${slug}\`
`;

  return md;
}

// Generate digest of all candidates
function generateDigest(candidates, retro) {
  let md = `# Stabilization Roadmap Handoff Digest

**Generated:** ${new Date().toISOString()}
**Retrospective Window:** ${retro.window.start?.split('T')[0]} to ${retro.window.end?.split('T')[0]} (${retro.window.weeks} weeks)
**Total Candidates:** ${candidates.length}

---

## Selected Candidates

`;

  for (const candidate of candidates) {
    const emoji = candidate.severity === 'critical' ? '🔴' : candidate.severity === 'high' ? '🟠' : '🟡';
    md += `### ${emoji} ${candidate.title}

**Slug:** \`${candidate.slug}\`
**Category:** ${candidate.category}
**Severity:** ${candidate.severity}
**Score:** ${candidate.score}

**Rationale:** ${candidate.trigger}

**Key Evidence:**
`;

    for (const [key, value] of Object.entries(candidate.evidence)) {
      md += `- ${key}: ${typeof value === 'number' && value < 1 && value > 0 ? (value * 100).toFixed(1) + '%' : value}\n`;
    }

    md += `\n**Draft:** [ROADMAP_${candidate.slug}.md](drafts/ROADMAP_${candidate.slug}.md)\n\n---\n\n`;
  }

  md += `## Next Steps

1. **Review Drafts:** Review each candidate draft in \`drafts/\`
2. **Triage:** Assign owners and prioritize candidates
3. **Implement:** Execute systemic fixes according to proposed scope
4. **Monitor:** Track acceptance criteria metrics in monthly retrospectives

---

**Note:** All candidates are in **draft mode** by default. To sync to GitHub issues, set \`policy.mode=apply\`.
`;

  return md;
}

// Search for existing GitHub issue by slug marker
async function findExistingIssue(slug, githubToken) {
  if (!githubToken) return null;

  try {
    const { stdout } = await execAsync(
      `gh issue list --search "Stabilization Roadmap Candidate Marker: ${slug}" --json number,title,state --limit 5`,
      { env: { ...process.env, GITHUB_TOKEN: githubToken } }
    );

    const issues = JSON.parse(stdout);
    return issues.find(i => i.state === 'open') || null;
  } catch (err) {
    console.warn(`Could not search for existing issue (${slug}):`, err.message);
    return null;
  }
}

// Create or update GitHub issue
async function syncToGitHub(candidate, draftPath, githubToken) {
  if (!githubToken) {
    throw new Error('GitHub token required for apply mode');
  }

  // Search for existing issue by marker
  const existing = await findExistingIssue(candidate.slug, githubToken);

  const labels = ['roadmap', 'stabilization', candidate.category, `severity:${candidate.severity}`, 'needs-triage'];
  const labelArgs = labels.map(l => `--label "${l}"`).join(' ');

  if (existing) {
    console.log(`  Found existing issue #${existing.number} for ${candidate.slug}, updating...`);

    // Update existing issue body
    await execAsync(
      `gh issue edit ${existing.number} --body-file "${draftPath}"`,
      { env: { ...process.env, GITHUB_TOKEN: githubToken } }
    );

    return { action: 'updated', number: existing.number };
  } else {
    console.log(`  Creating new issue for ${candidate.slug}...`);

    // Create new issue
    const { stdout } = await execAsync(
      `gh issue create --title "${candidate.title}" --body-file "${draftPath}" ${labelArgs}`,
      { env: { ...process.env, GITHUB_TOKEN: githubToken } }
    );

    const issueUrl = stdout.trim();
    const issueNumber = issueUrl.split('/').pop();

    return { action: 'created', number: issueNumber, url: issueUrl };
  }
}

// Main function
async function main() {
  const args = parseArgs();

  if (args.help) {
    console.log(`
Usage: node scripts/releases/sync_stabilization_roadmap_handoff.mjs [OPTIONS]

Options:
  --candidates=PATH   Path to candidates JSON (required)
  --retro=PATH        Path to retrospective JSON (required)
  --out-dir=PATH      Output directory (default: artifacts/stabilization/roadmap-handoff)
  --mode=MODE         Operation mode: draft|apply (default: draft)
  --github-token=TOKEN GitHub token for issue creation (required for apply mode)
  --help              Show this help message

Description:
  Generates roadmap handoff drafts from selected candidates and optionally
  syncs them to GitHub issues for triage and tracking.

Modes:
  draft - Generate markdown drafts only (default)
  apply - Generate drafts AND create/update GitHub issues
    `);
    return;
  }

  if (!args.candidates || !args.retro) {
    console.error('Error: --candidates=PATH and --retro=PATH are required');
    process.exit(1);
  }

  if (args.mode === 'apply' && !args.githubToken) {
    console.error('Error: --github-token or GITHUB_TOKEN env var required for apply mode');
    process.exit(1);
  }

  console.log('Generating Roadmap Handoff...');
  console.log(`  Candidates: ${args.candidates}`);
  console.log(`  Mode: ${args.mode}`);
  console.log(`  Output: ${args.outDir}\n`);

  // Load data
  const candidatesData = JSON.parse(await readFile(args.candidates, 'utf-8'));
  const retroData = JSON.parse(await readFile(args.retro, 'utf-8'));

  const candidates = candidatesData.candidates;

  // Ensure output directories exist
  const draftsDir = join(args.outDir, 'drafts');
  await mkdir(draftsDir, { recursive: true });

  // Generate drafts
  const syncResults = [];

  for (const candidate of candidates) {
    console.log(`Processing: ${candidate.slug}...`);

    const draft = generateCandidateDraft(candidate, retroData);
    const draftPath = join(draftsDir, `ROADMAP_${candidate.slug}.md`);

    await writeFile(draftPath, draft, 'utf-8');
    console.log(`  Draft: ${draftPath}`);

    if (args.mode === 'apply') {
      try {
        const result = await syncToGitHub(candidate, draftPath, args.githubToken);
        syncResults.push({ candidate: candidate.slug, ...result });
        console.log(`  GitHub: ${result.action} issue #${result.number}`);
      } catch (err) {
        console.error(`  GitHub sync failed: ${err.message}`);
        syncResults.push({ candidate: candidate.slug, action: 'failed', error: err.message });
      }
    }
  }

  // Generate digest
  const digest = generateDigest(candidates, retroData);
  const digestPath = join(args.outDir, 'digest.md');
  await writeFile(digestPath, digest, 'utf-8');

  console.log(`\n✅ Roadmap Handoff Generated`);
  console.log(`   Drafts: ${draftsDir}/`);
  console.log(`   Digest: ${digestPath}`);

  if (args.mode === 'apply') {
    console.log(`\n📋 GitHub Sync Results:`);
    for (const result of syncResults) {
      console.log(`   ${result.candidate}: ${result.action} ${result.number ? '#' + result.number : ''}`);
    }
  }

  console.log(`\n📊 Candidate Summary:`);
  for (const candidate of candidates) {
    console.log(`   - ${candidate.slug} (${candidate.severity}, score: ${candidate.score})`);
  }
}

main().catch(err => {
  console.error('Error generating roadmap handoff:', err);
  process.exit(1);
});
