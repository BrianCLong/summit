import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

// Configuration
const REPORT_PATH = process.env.REPORT_PATH || 'artifacts/ci-trends/report.json';
const TAXONOMY_PATH = process.env.TAXONOMY_PATH || 'docs/ci/FAILURE_TAXONOMY.yml';
const OWNERS_PATH = process.env.OWNERS_PATH || 'docs/ci/FAILURE_OWNERS.yml';
const ARTIFACTS_DIR = 'artifacts/ci-issues';
const DRAFTS_DIR = path.join(ARTIFACTS_DIR, 'drafts');
const DIGEST_PATH = path.join(ARTIFACTS_DIR, 'digest.md');
const MODE = process.env.MODE || 'draft'; // draft | apply

// Safety Gates
const MIN_COUNT = parseInt(process.env.MIN_COUNT || '10', 10);
const MIN_DELTA = parseInt(process.env.MIN_DELTA || '5', 10);
const MAX_ISSUES = parseInt(process.env.MAX_ISSUES || '5', 10);

// Ensure artifacts directories exist
if (!fs.existsSync(DRAFTS_DIR)) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

function runGh(command) {
  try {
    return execSync(`gh ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    if (error.stderr) console.error(`gh error: ${error.stderr}`);
    throw error;
  }
}

function findExistingIssue(failureCode) {
  // Search for open issues with label 'ci-failure' and the failure code in title or body
  const query = `label:ci-failure "${failureCode}" state:open`;
  // Sort by updated to pick the most active one if duplicates exist
  const json = runGh(`issue list --search '${query}' --json number,title,updatedAt --limit 1 --order desc --sort updated`);
  const issues = JSON.parse(json);
  return issues.length > 0 ? issues[0] : null;
}

function createIssue(title, body, labels) {
  const labelStr = labels.join(',');
  const bodyFile = path.join(ARTIFACTS_DIR, 'temp_body.md');
  fs.writeFileSync(bodyFile, body);
  try {
    const json = runGh(`issue create --title "${title}" --body-file "${bodyFile}" --label "${labelStr}" --json url,number`);
    return JSON.parse(json);
  } finally {
    if (fs.existsSync(bodyFile)) fs.unlinkSync(bodyFile);
  }
}

function updateIssue(number, body) {
  const bodyFile = path.join(ARTIFACTS_DIR, 'temp_comment.md');
  fs.writeFileSync(bodyFile, body);
  try {
    const json = runGh(`issue comment ${number} --body-file "${bodyFile}" --json url`);
    return JSON.parse(json);
  } finally {
    if (fs.existsSync(bodyFile)) fs.unlinkSync(bodyFile);
  }
}

async function main() {
  console.log(`Running in ${MODE} mode`);
  console.log(`Gates: Min Count=${MIN_COUNT}, Min Delta=${MIN_DELTA}, Max Issues=${MAX_ISSUES}`);

  // 1. Load inputs
  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`Report not found at ${REPORT_PATH}`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

  if (!fs.existsSync(TAXONOMY_PATH)) {
    console.error(`Taxonomy not found at ${TAXONOMY_PATH}`);
    process.exit(1);
  }
  const taxonomy = yaml.load(fs.readFileSync(TAXONOMY_PATH, 'utf8'));
  const taxonomyMap = new Map(taxonomy.failures.map(f => [f.code, f]));

  let owners = {};
  if (fs.existsSync(OWNERS_PATH)) {
    owners = yaml.load(fs.readFileSync(OWNERS_PATH, 'utf8'));
  }

  // 2. Process Action Queue with Safety Gates
  const rawQueue = report.action_queue.filter(item => ['P0', 'P1'].includes(item.priority));

  const filteredQueue = rawQueue.filter(item => {
    if (item.count < MIN_COUNT) return false;
    if (item.delta < MIN_DELTA) return false;
    return true;
  });

  console.log(`Queue: ${rawQueue.length} items. Filtered: ${filteredQueue.length} items (above thresholds).`);

  // Cap the number of processed items
  const queue = filteredQueue.slice(0, MAX_ISSUES);
  if (filteredQueue.length > MAX_ISSUES) {
    console.log(`Capping at ${MAX_ISSUES} issues.`);
  }

  const digestEntries = [];

  for (const item of queue) {
    const { failure_code, count, delta, top_workflows } = item;
    const taxEntry = taxonomyMap.get(failure_code);

    if (!taxEntry) {
      console.warn(`Failure code ${failure_code} not found in taxonomy. Skipping.`);
      continue;
    }

    const title = `[${failure_code}] ${taxEntry.category} Failure in ${top_workflows[0]} — CI regression`;
    const body = generateIssueBody(item, taxEntry, owners[failure_code]);
    const updateBody = generateUpdateBody(item);

    // Check for existing issue
    let existingIssue = null;
    try {
        existingIssue = findExistingIssue(failure_code);
    } catch (e) {
        console.warn(`Failed to check for existing issue: ${e.message}. Proceeding as if none exists.`);
    }

    if (MODE === 'draft') {
      const draftPath = path.join(DRAFTS_DIR, `${failure_code}.md`);
      const content = `---\ntitle: "${title}"\nlabels: ci-failure, ${taxEntry.category}, ${taxEntry.severity}\nexisting_issue: ${existingIssue ? existingIssue.number : 'None'}\n---\n\n${existingIssue ? updateBody : body}`;
      fs.writeFileSync(draftPath, content);

      if (existingIssue) {
        digestEntries.push(`- **Drafted Update** for #${existingIssue.number}: [${title}](./drafts/${failure_code}.md) (Count: ${count}, Delta: ${delta})`);
      } else {
        digestEntries.push(`- **Drafted New**: [${title}](./drafts/${failure_code}.md) (Count: ${count}, Delta: ${delta})`);
      }

    } else if (MODE === 'apply') {
      if (existingIssue) {
        console.log(`Updating issue #${existingIssue.number}`);
        const res = updateIssue(existingIssue.number, updateBody);
        digestEntries.push(`- **Updated**: [${title}](${res.url}) (Count: ${count}, Delta: ${delta})`);
      } else {
        console.log(`Creating new issue: ${title}`);
        const res = createIssue(title, body, ['ci-failure', taxEntry.category, taxEntry.severity]);
        digestEntries.push(`- **Created**: [${title}](${res.url}) (Count: ${count}, Delta: ${delta})`);
      }
    }
  }

  // Note dropped items
  const droppedCount = rawQueue.length - filteredQueue.length;
  if (droppedCount > 0) {
      digestEntries.push(`\n*Skipped ${droppedCount} items below thresholds (Count < ${MIN_COUNT}, Delta < ${MIN_DELTA}).*`);
  }

  // 3. Write Digest
  const digestContent = `# CI Issue Automation Digest\n\nGenerated at: ${new Date().toISOString()}\n\n## Actions\n\n${digestEntries.length > 0 ? digestEntries.join('\n') : 'No actions taken.'}\n`;
  fs.writeFileSync(DIGEST_PATH, digestContent);
  console.log(`Digest written to ${DIGEST_PATH}`);
}

function generateIssueBody(item, taxEntry, owner) {
  const { failure_code, count, delta, top_workflows, example_runs } = item;

  return `<!-- CI_FAILURE_CODE: ${failure_code} -->

### 🚨 CI Regression Detected

**Failure Code:** \`${failure_code}\`
**Category:** ${taxEntry.category}
**Severity:** ${taxEntry.severity}
${owner ? `**Owner:** @${owner}` : ''}

### 📉 Trend Summary
- **Failure Count (Last 7 Days):** ${count}
- **Regression Delta:** ${delta > 0 ? `+${delta} 🔺` : `${delta}`}
- **Top Affected Workflows:**
${top_workflows.map(w => `  - \`${w}\``).join('\n')}

### 🔍 Evidence
${example_runs.slice(0, 3).map(url => `- ${url}`).join('\n')}

### 🛠 Remediation Guidance
${taxEntry.next_steps.map(step => `- [ ] ${step}`).join('\n')}

### ✅ Acceptance Criteria
- [ ] Failure count returns to baseline (< 5/week)
- [ ] Root cause identified and fixed
- [ ] Test coverage added/verified
`;
}

function generateUpdateBody(item) {
    const { count, delta, top_workflows, example_runs } = item;
    return `### 📉 Weekly Trend Update (${new Date().toLocaleDateString()})

- **Failure Count:** ${count}
- **Delta:** ${delta > 0 ? `+${delta} 🔺` : `${delta}`}
- **Top Workflows:** ${top_workflows.join(', ')}

**Latest Evidence:**
${example_runs.slice(0, 3).map(url => `- ${url}`).join('\n')}
`;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
