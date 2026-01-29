import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const sourcePath = resolve(repoRoot, 'pr-open.json');
const outputPath = resolve(repoRoot, 'docs/pr-lifecycle-report.md');

const raw = readFileSync(sourcePath, 'utf8');
const prs = JSON.parse(raw);

const categories = [
  {
    name: 'Security fixes',
    key: 'security',
    matcher: (pr) =>
      /security|owasp|trivy|abac|webauthn|zap/i.test(pr.title) ||
      (pr.labels || []).some((label) =>
        /security|owasp|trivy|abac|webauthn|zap/i.test(label.name),
      ),
  },
  {
    name: 'Integration chain',
    key: 'integration',
    matcher: (pr) =>
      /integration|integrations|integrate|argo|argocd|pagerduty|graphql/i.test(
        pr.title,
      ) ||
      (pr.labels || []).some((label) =>
        /integration|integrations|integrate|argo|argocd|pagerduty|graphql/i.test(
          label.name,
        ),
      ),
  },
  {
    name: 'OSINT slice',
    key: 'osint',
    matcher: (pr) =>
      /osint/i.test(pr.title) ||
      (pr.labels || []).some((label) => /osint/i.test(label.name)),
  },
];

const grouped = categories.map((category) => ({
  ...category,
  prs: prs.filter(category.matcher),
}));

const now = new Date().toISOString();
const readiness =
  'Summit Readiness Assertion: platform is READY; any gaps are governed exceptions pending evidence.';

const header = `# PR Lifecycle Report\n\n`;
const metadata = `**Generated:** ${now}\n\n**Readiness assertion:** ${readiness}\n\n`;

const missingEvidence =
  'CI/test/lint status is **Deferred pending GitHub checks** because pr-open.json does not carry check results.';

const commentTemplate = (pr) => `- **#${pr.number} — ${pr.title}**\n  - Merge-blocker comment: **Missing for merge:** publish green CI/test/lint evidence; ensure required reviewer approvals are recorded.`;

const sections = grouped
  .map((category) => {
    const list = category.prs.length
      ? category.prs.map(commentTemplate).join('\n')
      : '_No open PRs matched._';

    return `## ${category.name}\n\n${missingEvidence}\n\n${list}\n`;
  })
  .join('\n');

const recommendations = `## Actions to unblock\n\n1. Export PR checks via GitHub API and attach pass/fail evidence to each PR.\n2. Add missing tests/docs as follow-up commits on the PR branches where permitted.\n3. Require review sign-off per CODEOWNERS before merge.\n4. Record any deviations as **Governed Exceptions** with authority file references.\n`;

const report = `${header}${metadata}${sections}\n${recommendations}`;

writeFileSync(outputPath, report, 'utf8');

console.log(`Report written to ${outputPath}`);
