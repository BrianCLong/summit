/**
 * Summit Work Graph - Issue Enrichment & Platform Sync
 *
 * Enriches all backlog items with complete details and syncs across platforms.
 */

import { execSync } from 'node:child_process';

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
  milestone: { title: string } | null;
  state: string;
}

interface EnrichmentResult {
  issueNumber: number;
  enriched: boolean;
  additions: string[];
}

// Acceptance criteria templates by issue type
const ACCEPTANCE_CRITERIA_TEMPLATES: Record<string, string[]> = {
  security: [
    '- [ ] Vulnerability is patched and verified',
    '- [ ] Security scan passes with no critical/high findings',
    '- [ ] Penetration test validates fix',
    '- [ ] Security documentation updated',
    '- [ ] Incident response runbook updated if applicable',
  ],
  feature: [
    '- [ ] Feature implemented per specification',
    '- [ ] Unit tests written with >80% coverage',
    '- [ ] Integration tests passing',
    '- [ ] Documentation updated',
    '- [ ] Performance benchmarks met',
    '- [ ] Accessibility requirements met',
  ],
  bug: [
    '- [ ] Root cause identified and documented',
    '- [ ] Fix implemented and tested',
    '- [ ] Regression tests added',
    '- [ ] No new issues introduced',
    '- [ ] Release notes updated',
  ],
  infrastructure: [
    '- [ ] Infrastructure changes applied via IaC',
    '- [ ] Monitoring and alerting configured',
    '- [ ] Runbook created/updated',
    '- [ ] Rollback procedure documented',
    '- [ ] Load testing completed',
  ],
  documentation: [
    '- [ ] Documentation written and reviewed',
    '- [ ] Examples and code samples included',
    '- [ ] API reference updated if applicable',
    '- [ ] Screenshots/diagrams added where helpful',
  ],
  ci_cd: [
    '- [ ] Pipeline changes tested in staging',
    '- [ ] Build times within acceptable limits',
    '- [ ] All existing tests still pass',
    '- [ ] Documentation updated',
  ],
  ai_ml: [
    '- [ ] Model performance metrics documented',
    '- [ ] A/B test or evaluation completed',
    '- [ ] Bias and fairness checks performed',
    '- [ ] Inference latency within SLA',
    '- [ ] Model versioning and rollback supported',
  ],
  governance: [
    '- [ ] Policy implemented and enforced',
    '- [ ] Audit logging enabled',
    '- [ ] Compliance requirements met',
    '- [ ] Documentation updated',
    '- [ ] Stakeholder sign-off obtained',
  ],
  default: [
    '- [ ] Implementation complete',
    '- [ ] Tests written and passing',
    '- [ ] Code reviewed and approved',
    '- [ ] Documentation updated',
  ],
};

// Estimate points based on keywords
function estimateStoryPoints(title: string, body: string): number {
  const text = `${title} ${body}`.toLowerCase();

  if (text.includes('trivial') || text.includes('typo') || text.includes('simple fix')) return 1;
  if (text.includes('small') || text.includes('minor')) return 2;
  if (text.includes('refactor') || text.includes('update') || text.includes('add')) return 3;
  if (text.includes('implement') || text.includes('create') || text.includes('build')) return 5;
  if (text.includes('redesign') || text.includes('migrate') || text.includes('architecture')) return 8;
  if (text.includes('epic') || text.includes('major') || text.includes('complete')) return 13;

  return 3; // Default
}

// Determine issue type from content
function determineIssueType(title: string, labels: string[]): string {
  const titleLower = title.toLowerCase();
  const labelStr = labels.join(' ').toLowerCase();

  if (labelStr.includes('security') || titleLower.includes('security') || titleLower.includes('vuln')) return 'security';
  if (labelStr.includes('bug') || titleLower.includes('bug') || titleLower.includes('fix')) return 'bug';
  if (labelStr.includes('feature') || titleLower.includes('feature') || titleLower.includes('add')) return 'feature';
  if (titleLower.includes('docker') || titleLower.includes('helm') || titleLower.includes('k8s') || titleLower.includes('infra')) return 'infrastructure';
  if (titleLower.includes('doc') || titleLower.includes('readme') || titleLower.includes('guide')) return 'documentation';
  if (titleLower.includes('ci') || titleLower.includes('pipeline') || titleLower.includes('workflow')) return 'ci_cd';
  if (titleLower.includes('ai') || titleLower.includes('ml') || titleLower.includes('model') || titleLower.includes('inference')) return 'ai_ml';
  if (titleLower.includes('governance') || titleLower.includes('policy') || titleLower.includes('compliance')) return 'governance';

  return 'default';
}

// Generate enriched body with acceptance criteria
function generateEnrichedBody(issue: GitHubIssue): string {
  const issueType = determineIssueType(issue.title, issue.labels.map(l => l.name));
  const criteria = ACCEPTANCE_CRITERIA_TEMPLATES[issueType] || ACCEPTANCE_CRITERIA_TEMPLATES.default;
  const storyPoints = estimateStoryPoints(issue.title, issue.body || '');

  let enrichedBody = issue.body || '';

  // Add sections if not present
  if (!enrichedBody.includes('## Acceptance Criteria')) {
    enrichedBody += `\n\n## Acceptance Criteria\n${criteria.join('\n')}`;
  }

  if (!enrichedBody.includes('## Story Points')) {
    enrichedBody += `\n\n## Story Points\n**Estimate:** ${storyPoints} points`;
  }

  if (!enrichedBody.includes('## Definition of Done')) {
    enrichedBody += `\n\n## Definition of Done\n- [ ] Code complete and tested\n- [ ] PR reviewed and approved\n- [ ] CI/CD pipeline passing\n- [ ] Deployed to staging\n- [ ] QA sign-off`;
  }

  if (!enrichedBody.includes('## Links')) {
    enrichedBody += `\n\n## Links\n- GitHub Issue: #${issue.number}\n- Linear: _pending sync_\n- Notion: _pending sync_`;
  }

  return enrichedBody;
}

// Determine labels to add
function determineLabels(issue: GitHubIssue): string[] {
  const existingLabels = issue.labels.map(l => l.name);
  const labelsToAdd: string[] = [];
  const titleLower = issue.title.toLowerCase();

  // Type labels
  if (!existingLabels.some(l => l.includes('type:'))) {
    if (titleLower.includes('bug') || titleLower.includes('fix')) labelsToAdd.push('type:bug');
    else if (titleLower.includes('feature')) labelsToAdd.push('type:feature');
    else if (titleLower.includes('doc')) labelsToAdd.push('type:docs');
    else if (titleLower.includes('refactor')) labelsToAdd.push('type:refactor');
    else if (titleLower.includes('test')) labelsToAdd.push('type:test');
    else labelsToAdd.push('type:task');
  }

  // Priority labels based on milestone
  if (!existingLabels.some(l => l.includes('priority:'))) {
    if (issue.milestone?.title.includes('Sprint 1')) labelsToAdd.push('priority:high');
    else if (issue.milestone?.title.includes('Sprint 2')) labelsToAdd.push('priority:medium');
    else if (issue.milestone?.title.includes('Q2') || issue.milestone?.title.includes('Q3')) labelsToAdd.push('priority:medium');
    else labelsToAdd.push('priority:low');
  }

  // Area labels
  if (!existingLabels.some(l => l.includes('area:'))) {
    if (titleLower.includes('security') || titleLower.includes('auth')) labelsToAdd.push('area:security');
    else if (titleLower.includes('graph') || titleLower.includes('neo4j')) labelsToAdd.push('area:graph');
    else if (titleLower.includes('ui') || titleLower.includes('frontend')) labelsToAdd.push('area:frontend');
    else if (titleLower.includes('api') || titleLower.includes('backend')) labelsToAdd.push('area:backend');
    else if (titleLower.includes('ci') || titleLower.includes('deploy')) labelsToAdd.push('area:devops');
    else if (titleLower.includes('ai') || titleLower.includes('ml')) labelsToAdd.push('area:ai');
  }

  return labelsToAdd;
}

// Main enrichment function
export async function enrichIssue(issueNumber: number): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    issueNumber,
    enriched: false,
    additions: [],
  };

  try {
    // Get issue details
    const issueJson = execSync(
      `gh issue view ${issueNumber} --repo BrianCLong/summit --json number,title,body,labels,milestone,state`,
      { encoding: 'utf-8' }
    );
    const issue: GitHubIssue = JSON.parse(issueJson);

    // Generate enriched body
    const enrichedBody = generateEnrichedBody(issue);
    const labelsToAdd = determineLabels(issue);

    // Update issue if needed
    if (enrichedBody !== issue.body) {
      // Write body to temp file to handle special characters
      const fs = await import('node:fs');
      const tempFile = `/tmp/issue_body_${issueNumber}.md`;
      fs.writeFileSync(tempFile, enrichedBody);

      execSync(
        `gh issue edit ${issueNumber} --repo BrianCLong/summit --body-file "${tempFile}"`,
        { encoding: 'utf-8' }
      );
      result.additions.push('acceptance criteria', 'story points', 'definition of done');
    }

    // Add labels
    if (labelsToAdd.length > 0) {
      // Create labels if they don't exist
      for (const label of labelsToAdd) {
        execSync(
          `gh label create "${label}" --repo BrianCLong/summit --force 2>/dev/null || true`,
          { encoding: 'utf-8' }
        );
      }

      execSync(
        `gh issue edit ${issueNumber} --repo BrianCLong/summit --add-label "${labelsToAdd.join(',')}"`,
        { encoding: 'utf-8' }
      );
      result.additions.push(...labelsToAdd);
    }

    result.enriched = result.additions.length > 0;
  } catch (error) {
    console.error(`Failed to enrich issue #${issueNumber}:`, error);
  }

  return result;
}

// Batch enrichment
export async function enrichAllIssues(limit: number = 100): Promise<void> {
  console.log('🔧 Starting issue enrichment...\n');

  // Get issues that need enrichment (missing acceptance criteria)
  const issuesJson = execSync(
    `gh issue list --repo BrianCLong/summit --state open --limit ${limit} --json number,title,body`,
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
  );
  const issues = JSON.parse(issuesJson) as Array<{ number: number; title: string; body: string }>;

  // Filter to issues missing acceptance criteria
  const needsEnrichment = issues.filter(i =>
    !i.body?.includes('## Acceptance Criteria') ||
    !i.body?.includes('## Story Points')
  );

  console.log(`Found ${needsEnrichment.length} issues needing enrichment\n`);

  let enrichedCount = 0;
  for (const issue of needsEnrichment) {
    const result = await enrichIssue(issue.number);
    if (result.enriched) {
      enrichedCount++;
      console.log(`  ✓ #${issue.number}: ${result.additions.join(', ')}`);
    }
  }

  console.log(`\n✅ Enriched ${enrichedCount} issues`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const limit = parseInt(process.argv[2] || '50', 10);
  enrichAllIssues(limit).catch(console.error);
}
