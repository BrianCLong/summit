#!/usr/bin/env node
'use strict';

const fs = require('fs');

const fetch = global.fetch;

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

async function fetchJson(url, token) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'frontend-governance-input'
    }
  });

  if (!res.ok) {
    throw new Error(`GitHub API request failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

async function listChangedFiles(repo, prNumber, token) {
  const files = [];
  let page = 1;
  while (true) {
    const data = await fetchJson(
      `https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`,
      token
    );
    files.push(...data.map((file) => file.filename));
    if (data.length < 100) {
      break;
    }
    page += 1;
  }
  return files;
}

function capture(body, regex) {
  const match = body.match(regex);
  return match ? match[1].trim() : '';
}

function parseIntake(body) {
  return {
    change_class: capture(body, /Change class\s*\(0-4\)\s*:\s*([0-4])/i),
    risk_level: capture(body, /Risk level\s*:\s*(low|medium|high)/i).toLowerCase(),
    affected_surfaces: capture(body, /Affected surfaces\s*:\s*(.+)/i),
    ga_locked_ack: capture(body, /GA-locked files touched\?\s*:\s*(yes|no)/i).toLowerCase()
  };
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const prNumber = process.env.PR_NUMBER;
  const outputPath = process.env.OUTPUT_PATH || 'frontend-governance-input.json';

  if (!repo || !token || !prNumber) {
    fail('Missing GITHUB_REPOSITORY, GITHUB_TOKEN, or PR_NUMBER environment variables.');
  }

  const pr = await fetchJson(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, token);
  const files = await listChangedFiles(repo, prNumber, token);

  const intake = parseIntake(pr.body || '');

  const output = {
    pr: {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      author: pr.user?.login || 'unknown',
      labels: pr.labels.map((label) => label.name),
      body: pr.body || ''
    },
    files,
    intake
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  fail(error.message);
});
