#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

// --- Paths & Constants ---
const ARTIFACTS_DIR = 'artifacts';
const SELECTED_FILE = path.join(ARTIFACTS_DIR, 'ci-roadmap/selected.json');
const DRAFTS_DIR = path.join(ARTIFACTS_DIR, 'ci-roadmap/drafts');
const DIGEST_FILE = path.join(ARTIFACTS_DIR, 'ci-roadmap/digest.md');
const POLICY_FILE = 'policy/ci-roadmap.yml';

// --- Helpers ---

function safeReadJson(filepath) {
  try {
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.warn(`Warning: Failed to read ${filepath}: ${e.message}`);
    return null;
  }
}

function safeReadYaml(filepath) {
  try {
    if (!fs.existsSync(filepath)) return null;
    return yaml.load(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.warn(`Warning: Failed to read ${filepath}: ${e.message}`);
    return null;
  }
}

// GitHub API Wrapper using gh CLI if available, or fetch if GITHUB_TOKEN is present
// We prefer fetch in Node.js environment if token is available.

async function githubRequest(endpoint, method = 'GET', body = null) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY; // e.g., "owner/repo"

  if (!token || !repo) {
    console.warn("Missing GITHUB_TOKEN or GITHUB_REPOSITORY. Skipping GitHub API calls.");
    return null;
  }

  const url = `https://api.github.com/repos/${repo}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'CI-Roadmap-Sync'
  };

  try {
    const options = {
      method,
      headers
    };
    if (body) {
      options.body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        // If 404 on search, it's fine, return empty.
        // But usually search returns 200 with items: []
        const text = await response.text();
        console.error(`GitHub API Error: ${response.status} ${response.statusText} - ${text}`);
        return null;
    }
    return await response.json();
  } catch (e) {
    console.error(`Network Error: ${e.message}`);
    return null;
  }
}

async function findExistingIssue(marker) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token || !repo) return null;

  // Search API: https://api.github.com/search/issues
  // q=repo:OWNER/REPO+marker+in:body+is:issue
  const query = `repo:${repo} "${marker}" in:body is:issue`;
  const endpoint = `/search/issues?q=${encodeURIComponent(query)}`;

  // Note: search/issues is global, not per repo endpoint, but we qualify with repo:
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'CI-Roadmap-Sync'
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return {
        number: data.items[0].number,
        url: data.items[0].html_url,
        state: data.items[0].state
      };
    }
  } catch (e) {
    console.error(`Search Error: ${e.message}`);
  }
  return null;
}

async function createIssue(title, body, labels) {
    const response = await githubRequest('/issues', 'POST', {
        title,
        body,
        labels
    });
    if (response) {
        return {
            number: response.number,
            url: response.html_url
        };
    }
    return null;
}

async function updateIssue(number, bodyAppend) {
    // We append a comment rather than editing the body to keep history?
    // Prompt says: "append a short weekly update comment or update issue body section"
    // Let's comment.
    const response = await githubRequest(`/issues/${number}/comments`, 'POST', {
        body: bodyAppend
    });
    return response !== null;
}

// --- Logic ---

async function main() {
  console.log("Starting CI Roadmap Sync...");

  // 1. Load Inputs
  const selectedData = safeReadJson(SELECTED_FILE);
  const policyConfig = safeReadYaml(POLICY_FILE);
  const policy = policyConfig ? policyConfig.ci_roadmap_sync : null;

  if (!selectedData || !selectedData.items) {
    console.log("No selected items found. Exiting.");
    return;
  }

  const items = selectedData.items;
  const mode = policy ? policy.mode : 'draft';
  const labels = policy ? policy.labels.base.concat(policy.labels.triage) : ['ci-reliability', 'needs-triage'];

  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }

  let digestContent = `# CI Reliability Roadmap Sync\n\n`;
  digestContent += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
  digestContent += `**Mode:** ${mode}\n`;
  digestContent += `**Items Selected:** ${items.length}\n\n`;
  digestContent += `| Priority | Type | Title | Status | Action |\n`;
  digestContent += `| :--- | :--- | :--- | :--- | :--- |\n`;

  for (const item of items) {
    const marker = `<!-- CI_ROADMAP_ITEM: ${item.id} -->`;
    const existingIssue = await findExistingIssue(marker);
    let status = 'New';
    let actionLink = 'N/A';

    const body = `
${marker}
# ${item.title}

**Source:** CI Roadmap Sync
**Type:** ${item.type}
**Score:** ${item.score}

## Description
${item.description}

## Evidence
${item.evidence ? `[Link to Evidence](${item.evidence})` : 'None provided'}

## Remediation Owner
Check FAILURE_TAXONOMY.yml or OKR owner.

---
*Generated by CI Reliability Roadmap Sync*
    `.trim();

    if (existingIssue) {
      status = `Existing (${existingIssue.state})`;
      actionLink = `[Issue #${existingIssue.number}](${existingIssue.url})`;

      if (mode === 'apply') {
          console.log(`[APPLY] Updating issue #${existingIssue.number}`);
          await updateIssue(existingIssue.number, `**Weekly Sync Update**: Item re-selected with score ${item.score}. Regression: ${item.description}`);
          status = 'Existing (Updated)';
      }
    } else {
      // Create Draft
      const draftPath = path.join(DRAFTS_DIR, `${item.id}.md`);
      fs.writeFileSync(draftPath, body);

      status = 'Draft Created';
      actionLink = `[View Draft](./drafts/${item.id}.md)`;

      if (mode === 'apply') {
        console.log(`[APPLY] Creating issue: ${item.title}`);
        const created = await createIssue(item.title, body, labels);
        if (created) {
            status = 'Issue Created';
            actionLink = `[Issue #${created.number}](${created.url})`;
            // Remove draft if issue created? keep it for audit.
        } else {
            status = 'Issue Creation Failed';
        }
      }
    }

    digestContent += `| ${item.score} | ${item.type} | ${item.title} | ${status} | ${actionLink} |\n`;
  }

  digestContent += `\n\n## Next Steps\n`;
  digestContent += `Review the drafts in \`${DRAFTS_DIR}\`. If policy mode is 'apply', issues are automatically created.\n`;

  fs.writeFileSync(DIGEST_FILE, digestContent);
  console.log(`Digest written to ${DIGEST_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
