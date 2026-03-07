import fs from 'node:fs';
import path from 'node:path';

const prNumber = process.env.PR_NUMBER;
const sha = process.env.SHA;
const token = process.env.GH_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';

if (!prNumber || !sha || !token || !repo) {
  throw new Error('PR_NUMBER, SHA, GH_TOKEN, and GITHUB_REPOSITORY are required.');
}

const reportPath = path.join(process.cwd(), 'evidence', sha, 'report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const [owner, name] = repo.split('/');

const marker = '<!-- provenance-sbom -->';
const lines = [
  marker,
  '## Provenance + SBOM',
  '',
  `- Commit: \`${sha}\``,
  `- Evidence: \`evidence/${sha}/report.json\` (artifact in this workflow run)`,
  `- SBOM: \`sbom.spdx.json\` (artifact)`,
  `- Provenance status: **${report.provenance.status}**`,
  '',
  'Signing and attestations are emitted only from trusted workflows with OIDC enabled.',
];
const body = `${lines.join('\n')}\n`;

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
};

const commentsUrl = `${apiBase}/repos/${owner}/${name}/issues/${prNumber}/comments`;
const commentsResponse = await fetch(commentsUrl, { headers });

if (!commentsResponse.ok) {
  throw new Error(`Failed to list comments: ${commentsResponse.status}`);
}

const comments = await commentsResponse.json();
const existing = comments.find((comment) => comment.body?.includes(marker));

if (existing) {
  const updateUrl = `${apiBase}/repos/${owner}/${name}/issues/comments/${existing.id}`;
  const updateResponse = await fetch(updateUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ body }),
  });

  if (!updateResponse.ok) {
    throw new Error(`Failed to update comment: ${updateResponse.status}`);
  }
} else {
  const createResponse = await fetch(commentsUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ body }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create comment: ${createResponse.status}`);
  }
}
