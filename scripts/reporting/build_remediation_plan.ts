
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Types (mirrored from validation script)
interface ReasonCode {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  owner: string;
  runbook_links: string[];
  suggested_actions: string[];
  verification_steps: string;
  rollback_notes: string;
}

interface EnforcementDecision {
  status: 'pass' | 'fail';
  reasons?: Array<{
    code: string;
    details?: string;
    context?: any;
  }>;
}

const REASON_CODES_PATH = path.join(process.cwd(), 'ci/reason-codes.yml');
const ENFORCEMENT_DECISION_PATH = path.join(process.cwd(), 'dist/compliance/enforcement-decision.json');
const OUTPUT_DIR = path.join(process.cwd(), 'dist/remediation');

function loadReasonCodes(): ReasonCode[] {
  try {
    const fileContent = fs.readFileSync(REASON_CODES_PATH, 'utf8');
    return yaml.load(fileContent) as ReasonCode[];
  } catch (e) {
    console.error(`Failed to load reason codes from ${REASON_CODES_PATH}`, e);
    return [];
  }
}

function loadEnforcementDecision(): EnforcementDecision | null {
  try {
    if (!fs.existsSync(ENFORCEMENT_DECISION_PATH)) {
      console.warn(`Enforcement decision file not found at ${ENFORCEMENT_DECISION_PATH}. Attempting to proceed with dummy failure for testing if strictly required, or exit.`);
      // For the purpose of this task, if the file is missing, we might want to simulate one if we are in a test mode,
      // but in prod we should probably return null.
      // However, to satisfy "Inputs: dist/compliance/enforcement-decision.json", let's assume it exists or use a mock if passed via env.
      return null;
    }
    const content = fs.readFileSync(ENFORCEMENT_DECISION_PATH, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Failed to load enforcement decision`, e);
    return null;
  }
}

// Severity ranking for sorting
const SEVERITY_RANK = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function generateRemediationPlan() {
  const codes = loadReasonCodes();
  const decision = loadEnforcementDecision();

  if (!decision) {
    console.log('No enforcement decision found. Skipping remediation plan generation.');
    return;
  }

  if (decision.status === 'pass') {
    console.log('Enforcement passed. No remediation needed.');
    return;
  }

  // Map codes for lookup
  const codeMap = new Map(codes.map(c => [c.code, c]));

  // Identify active codes from decision
  const activeReasons = decision.reasons || [];
  const identifiedIssues = activeReasons.map(reason => {
    const def = codeMap.get(reason.code);
    return {
      code: reason.code,
      details: reason.details,
      definition: def || {
        code: reason.code,
        severity: 'low', // Default if unknown
        owner: 'unknown',
        runbook_links: [],
        suggested_actions: ['Investigate unknown error code'],
        verification_steps: 'Manual verification',
        rollback_notes: 'None'
      } as ReasonCode
    };
  });

  // Sort by severity (Critical first)
  identifiedIssues.sort((a, b) => {
    const rankA = SEVERITY_RANK[a.definition.severity] ?? 99;
    const rankB = SEVERITY_RANK[b.definition.severity] ?? 99;
    return rankA - rankB;
  });

  // Prepare output structure
  const plan = {
    timestamp: new Date().toISOString(),
    status: 'generated',
    issues: identifiedIssues.map(i => ({
      code: i.code,
      severity: i.definition.severity,
      summary: i.details,
      actions: i.definition.suggested_actions,
      verification: i.definition.verification_steps,
      runbooks: i.definition.runbook_links
    }))
  };

  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(path.join(OUTPUT_DIR, 'remediation-checklists'), { recursive: true });
    fs.mkdirSync(path.join(OUTPUT_DIR, 'issue-templates'), { recursive: true });
  }

  // 1. Write JSON
  fs.writeFileSync(path.join(OUTPUT_DIR, 'remediation.json'), JSON.stringify(plan, null, 2));

  // 2. Write Markdown
  const mdContent = generateMarkdown(identifiedIssues);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'remediation.md'), mdContent);

  // 3. Write Checklists
  const prChecklist = generatePRChecklist(identifiedIssues);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'remediation-checklists/pr-checklist.md'), prChecklist);

  const incidentChecklist = generateIncidentChecklist(identifiedIssues);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'remediation-checklists/incident-checklist.md'), incidentChecklist);

  // 4. Write Issue Templates
  const issueTemplate = generateIssueTemplate(identifiedIssues);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'issue-templates/remediation-issue.md'), issueTemplate);

  console.log(`Remediation plan generated in ${OUTPUT_DIR}`);
}

function generateMarkdown(issues: any[]): string {
  let md = `# Remediation Plan\n\nGenerated: ${new Date().toISOString().split('T')[0]}\n\n`;

  if (issues.length === 0) {
    md += "No known issues identified, but enforcement failed. Please check raw logs.\n";
    return md;
  }

  md += `## Top Priority Fixes\n\n`;

  issues.forEach((issue, idx) => {
    const def = issue.definition;
    md += `### ${idx + 1}. ${issue.code} (${def.severity.toUpperCase()})\n`;
    if (issue.details) md += `**Context:** ${issue.details}\n\n`;

    md += `**Runbook:** ${def.runbook_links.map((l: string) => `[Link](${l})`).join(', ') || 'None'}\n\n`;

    md += `**Minimal Fix Path:**\n`;
    def.suggested_actions.forEach((action: string, i: number) => {
      md += `${i + 1}. ${action}\n`;
    });
    md += `\n**Verification:** \`${def.verification_steps}\`\n\n`;
    md += `---\n`;
  });

  md += `\n## Hardening Path\n`;
  md += `To prevent recurrence:\n`;
  md += `- [ ] Add regression test for identified codes.\n`;
  md += `- [ ] Update policy definitions if this was a valid change.\n`;

  return md;
}

function generatePRChecklist(issues: any[]): string {
  let md = `## Remediation PR Checklist\n\n`;
  md += `**Primary Issues:** ${issues.map(i => i.code).join(', ')}\n\n`;

  md += `### Artifacts to Regenerate\n`;
  md += `- [ ] \`dist/compliance/enforcement-decision.json\` (via passing CI)\n`;

  md += `### Verification\n`;
  issues.forEach(issue => {
    md += `- [ ] **${issue.code}**: \`${issue.definition.verification_steps}\`\n`;
  });

  md += `\n### Evidence\n`;
  md += `- [ ] Attach screenshot of passing verification.\n`;
  md += `- [ ] Link to updated runbook if steps were ambiguous.\n`;

  return md;
}

function generateIncidentChecklist(issues: any[]): string {
  let md = `## Incident Response Checklist\n\n`;

  const criticalIssues = issues.filter(i => i.definition.severity === 'critical');
  if (criticalIssues.length > 0) {
    md += `### 🚨 CRITICAL ALERT\n`;
    md += `**Severity: CRITICAL** detected. Initiate immediate freeze.\n`;
    md += `- [ ] Execute \`scripts/enable-freeze.sh\`\n`;
  }

  md += `### Investigation\n`;
  issues.forEach(issue => {
    md += `- [ ] Investigate **${issue.code}** using [Runbook](${issue.definition.runbook_links[0] || '#'})\n`;
    md += `  - Rollback note: ${issue.definition.rollback_notes}\n`;
  });

  md += `\n### Communication\n`;
  md += `- [ ] Notify ${[...new Set(issues.map(i => i.definition.owner))].join(', ')} teams.\n`;

  return md;
}

function generateIssueTemplate(issues: any[]): string {
  let md = `---
title: "Remediation: ${issues.map(i => i.code).join(', ')}"
labels: compliance, remediation
assignees: ${[...new Set(issues.map(i => i.definition.owner))].join(', ')}
---

## Compliance Regression Detected

**Generated Plan:** [Link to Artifact]

### Blocking Issues
${issues.map(i => `- **${i.code}** (${i.definition.severity}): ${i.details || 'No details'}`).join('\n')}

### Action Plan
${issues.map(i => `
#### ${i.code}
- Runbook: ${i.definition.runbook_links.join(', ')}
- Actions:
${i.definition.suggested_actions.map((a: string) => `  - [ ] ${a}`).join('\n')}
`).join('\n')}

### Verification
Please verify fixes by running:
\`\`\`bash
${issues.map(i => i.definition.verification_steps).join('\n')}
\`\`\`
`;
  return md;
}

generateRemediationPlan();
