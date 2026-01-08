#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Configuration
const REPORT_PATH = process.env.REPORT_PATH || 'artifacts/ci-trends/report.json';
const TAXONOMY_PATH = process.env.TAXONOMY_PATH || 'docs/ci/FAILURE_TAXONOMY.yml';
const OWNERS_PATH = process.env.OWNERS_PATH || 'docs/ci/FAILURE_OWNERS.yml';
const POLICY_PATH = process.env.POLICY_PATH || 'scripts/ci/ci_issue_policy.json';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'artifacts/ci-issues';
const DRAFTS_DIR = path.join(OUTPUT_DIR, 'drafts');
const DIGEST_PATH = path.join(OUTPUT_DIR, 'digest.md');

// GitHub API setup
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[0] : 'BrianCLong';
const REPO_NAME = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : 'summit';
const API_BASE = process.env.GITHUB_API_URL || 'https://api.github.com';

// Ensure output directories exist
if (!fs.existsSync(DRAFTS_DIR)) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

// Load inputs
function loadInputs() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`Report file not found: ${REPORT_PATH}`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

  if (!fs.existsSync(TAXONOMY_PATH)) {
    console.error(`Taxonomy file not found: ${TAXONOMY_PATH}`);
    process.exit(1);
  }
  const taxonomy = yaml.load(fs.readFileSync(TAXONOMY_PATH, 'utf8'));

  let owners = {};
  if (fs.existsSync(OWNERS_PATH)) {
    owners = yaml.load(fs.readFileSync(OWNERS_PATH, 'utf8'));
  }

  let policy = {
    ci_issue_automation: {
      enabled: true,
      mode: 'draft',
      min_count: 10,
      min_regression_delta: 5,
      max_issues_per_week: 5
    }
  };

  if (fs.existsSync(POLICY_PATH)) {
    const loadedPolicy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
    if (loadedPolicy.ci_issue_automation) {
      policy = loadedPolicy;
    }
  }

  return { report, taxonomy, owners, policy: policy.ci_issue_automation };
}

// GitHub API helpers
async function searchExistingIssues(failureCode) {
  if (!GITHUB_TOKEN) {
    console.warn('GITHUB_TOKEN not set, skipping existing issue search (mock mode)');
    return [];
  }

  const query = `repo:${REPO_OWNER}/${REPO_NAME} is:issue is:open label:ci-failure "${failureCode}"`;
  try {
    const response = await fetch(`${API_BASE}/search/issues?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
        // Fallback for when repository is not found or other errors
        console.warn(`Search failed: ${response.status} ${response.statusText}`);
        return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    // Fail safe: Do not assume no issues exist if the search fails.
    console.error(`CRITICAL: Error searching issues: ${error.message}`);
    throw error; // Propagate error to stop execution
  }
}

async function createIssue(title, body, labels) {
  if (!GITHUB_TOKEN) {
    console.log(`[DRY RUN] Would create issue: ${title}`);
    return { html_url: 'http://mock-github.com/issue/new' };
  }

  const response = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body, labels })
  });

  if (!response.ok) {
    throw new Error(`Failed to create issue: ${response.statusText}`);
  }

  return response.json();
}

async function updateIssue(issueNumber, bodyAppend) {
  if (!GITHUB_TOKEN) {
    console.log(`[DRY RUN] Would update issue #${issueNumber}`);
    return { html_url: `http://mock-github.com/issue/${issueNumber}` };
  }

  // First get current body
  const getResponse = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!getResponse.ok) {
      throw new Error(`Failed to get issue #${issueNumber}`);
  }

  const issue = await getResponse.json();
  const newBody = issue.body + "\n\n" + bodyAppend;

  const response = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body: newBody })
  });

  if (!response.ok) {
    throw new Error(`Failed to update issue: ${response.statusText}`);
  }

  return response.json();
}

// Main logic
async function run() {
  const { report, taxonomy, owners, policy } = loadInputs();

  if (!policy.enabled) {
    console.log('Automation disabled by policy.');
    return;
  }

  const digestEntries = [];
  let issuesProcessed = 0;

  // Build a map of taxonomy for easy lookup
  const taxonomyMap = new Map();
  if (taxonomy.taxonomies) {
    taxonomy.taxonomies.forEach(t => taxonomyMap.set(t.code, t));
  }

  console.log(`Processing ${report.action_queue.length} items from queue...`);

  for (const item of report.action_queue) {
    if (issuesProcessed >= policy.max_issues_per_week) {
      console.log('Max issues per week reached.');
      break;
    }

    const tax = taxonomyMap.get(item.failure_code);
    if (!tax) {
      console.warn(`Unknown failure code: ${item.failure_code}, skipping.`);
      continue;
    }

    // Safety checks
    if (tax.severity !== 'P0' && tax.severity !== 'P1') {
      console.log(`Skipping ${item.failure_code}: severity ${tax.severity} < P1`);
      continue;
    }
    if (item.count < policy.min_count) {
      console.log(`Skipping ${item.failure_code}: count ${item.count} < ${policy.min_count}`);
      continue;
    }
    if (item.delta < policy.min_regression_delta) {
        console.log(`Skipping ${item.failure_code}: delta ${item.delta} < ${policy.min_regression_delta}`);
        continue;
    }

    console.log(`Analyzing ${item.failure_code} (${tax.severity})...`);

    // Prepare content
    const title = `[${item.failure_code}] ${tax.description} — CI regression`;
    const labels = ['ci-failure', `severity/${tax.severity.toLowerCase()}`, `category/${tax.category.toLowerCase().replace(/\s+/g, '-')}`];

    const owner = owners[item.failure_code] || 'Unassigned';

    const bodyContent = `
## Failure Analysis
**Code:** ${item.failure_code}
**Category:** ${tax.category}
**Severity:** ${tax.severity}
**Owner:** ${owner}

## Trend Data
- **Failure Count (This Week):** ${item.count}
- **Regression Delta:** +${item.delta}
- **Affected Workflows:** ${item.workflows.join(', ')}

## Evidence
${item.examples.slice(0, 3).map(url => `- ${url}`).join('\n')}

## Reproduction & Next Steps
${tax.next_steps.map(step => `- [ ] ${step}`).join('\n')}

## Acceptance Criteria
- [ ] Failure count returns to baseline (0 or < threshold)
- [ ] Root cause identified and fixed
- [ ] Test coverage added or guardrail implemented

<!-- CI_FAILURE_CODE: ${item.failure_code} -->
`;

    // Deduplication
    const existingIssues = await searchExistingIssues(item.failure_code);
    let action = 'create';
    let targetIssue = null;

    if (existingIssues.length > 0) {
      // Find most recent updated open issue
      existingIssues.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      targetIssue = existingIssues[0];
      action = 'update';

      if (existingIssues.length > 1) {
        digestEntries.push(`WARNING: Multiple open issues found for ${item.failure_code}. Using #${targetIssue.number}.`);
      }
    }

    // Execution
    if (policy.mode === 'draft') {
      const draftPath = path.join(DRAFTS_DIR, `${item.failure_code}.md`);
      const draftContent = `---\ntitle: "${title}"\nlabels: ${JSON.stringify(labels)}\n---\n${bodyContent}`;
      fs.writeFileSync(draftPath, draftContent);

      if (action === 'create') {
        digestEntries.push(`- **[DRAFT]** Create new issue for ${item.failure_code}: ${title}`);
      } else {
        digestEntries.push(`- **[DRAFT]** Update existing issue #${targetIssue.number} for ${item.failure_code}`);
      }
    } else if (policy.mode === 'apply') {
      if (action === 'create') {
        try {
          const issue = await createIssue(title, bodyContent, labels);
          digestEntries.push(`- **[CREATED]** Created issue for ${item.failure_code}: ${issue.html_url}`);
        } catch (e) {
            digestEntries.push(`- **[ERROR]** Failed to create issue for ${item.failure_code}: ${e.message}`);
        }
      } else {
        try {
          const updateBody = `### Latest Trend Update (${new Date().toISOString().split('T')[0]})\n- Count: ${item.count}\n- Delta: +${item.delta}`;
          const issue = await updateIssue(targetIssue.number, updateBody);
          digestEntries.push(`- **[UPDATED]** Updated issue #${targetIssue.number} for ${item.failure_code}: ${issue.html_url}`);
        } catch (e) {
             digestEntries.push(`- **[ERROR]** Failed to update issue #${targetIssue.number}: ${e.message}`);
        }
      }
    }

    issuesProcessed++;
  }

  // Write digest
  const digestContent = `# CI Issue Automation Digest\nGenerated: ${new Date().toISOString()}\n\n${digestEntries.join('\n')}\n`;
  fs.writeFileSync(DIGEST_PATH, digestContent);
  console.log(`Digest written to ${DIGEST_PATH}`);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
