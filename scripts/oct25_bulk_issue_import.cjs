#!/usr/bin/env node
/*
 * Bulk importer for October 2025 issues.
 * Reads scripts/output/issues_import.csv (preferred) or project_management/october2025_issue_json/batch_*.json.
 * Creates GitHub issues sequentially.
 * Optional project attachment via GraphQL when PROJECT_ID is set and ADD_TO_PROJECT=1.
 * To avoid duplicate titles, existing issues (matching label set) are fetched once at startup.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const OWNER = process.env.OWNER;
const REPO = process.env.REPO;
const GH_TOKEN = process.env.GH_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID || '';
const ADD_TO_PROJECT = process.env.ADD_TO_PROJECT === '1' && !!PROJECT_ID;
const SLEEP_MS = Number(process.env.SLEEP_MS || '200');

if (!OWNER || !REPO) {
  console.error('Set OWNER and REPO environment variables.');
  process.exit(1);
}
if (!GH_TOKEN) {
  console.error(
    'Set GH_TOKEN environment variable (Fine-grained PAT or gh auth token).',
  );
  process.exit(1);
}

const CSV_PATH = process.env.CSV_PATH
  ? path.resolve(process.env.CSV_PATH)
  : path.join('scripts', 'output', 'issues_import.csv');
const BATCH_DIR = process.env.BATCH_DIR
  ? path.resolve(process.env.BATCH_DIR)
  : path.join('project_management', 'october2025_issue_json');
const SECONDARY_BACKOFF_BASE_MS = Number(
  process.env.SECONDARY_BACKOFF_MS || '60000',
);
const SECONDARY_BACKOFF_MAX_MS = Number(
  process.env.SECONDARY_BACKOFF_MAX_MS || '300000',
);

const START_INDEX = Math.max(1, Number(process.env.START_BATCH || '1'));
const END_INDEX_RAW = Number(process.env.END_BATCH || '999999');
const END_INDEX = Number.isNaN(END_INDEX_RAW)
  ? Number.POSITIVE_INFINITY
  : END_INDEX_RAW;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        const next = content[i + 1];
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char === '\r') {
      if (content[i + 1] === '\n') {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((value) => value !== ''));
}

function loadEntriesFromCsv() {
  if (!fs.existsSync(CSV_PATH)) {
    return null;
  }

  console.log(`Loading CSV entries from ${CSV_PATH}`);
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  if (!content.trim()) {
    console.warn('CSV file is empty.');
    return [];
  }

  const rows = parseCsv(content);
  if (rows.length === 0) {
    console.warn('CSV parser produced no rows.');
    return [];
  }

  const headers = rows[0];
  const requiredHeaders = [
    'Title',
    'Body',
    'Labels',
    'Assignees',
    'Repository',
  ];

  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    console.error(`CSV missing required headers: ${missing.join(', ')}`);
    process.exit(1);
  }

  const headerIndex = new Map();
  headers.forEach((header, index) => {
    headerIndex.set(header, index);
  });

  const desiredRepo = `${OWNER}/${REPO}`.toLowerCase();
  const entries = [];
  let skippedRepo = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const title = (row[headerIndex.get('Title')] || '').trim();
    const repository = (row[headerIndex.get('Repository')] || '')
      .trim()
      .toLowerCase();
    if (!title) {
      continue;
    }

    if (repository && repository !== desiredRepo) {
      skippedRepo += 1;
      continue;
    }

    const body = row[headerIndex.get('Body')] || '';
    const labelsRaw = row[headerIndex.get('Labels')] || '';
    const assigneesRaw = row[headerIndex.get('Assignees')] || '';

    const entry = {
      title,
      body,
      labels: labelsRaw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    };

    const assignees = assigneesRaw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (assignees.length > 0) {
      entry.assignees = assignees;
    }

    entries.push(entry);
  }

  if (skippedRepo > 0) {
    console.log(`Skipped ${skippedRepo} CSV rows for other repositories.`);
  }

  return entries;
}

function gh(
  pathname,
  { method = 'GET', body = null, accept = 'application/vnd.github+json' } = {},
) {
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: pathname,
        method,
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          'User-Agent': 'oct25-bulk-importer',
          Accept: accept,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', async () => {
          if (
            res.statusCode === 403 &&
            res.headers['x-ratelimit-remaining'] === '0'
          ) {
            const reset =
              Number(res.headers['x-ratelimit-reset'] || '0') * 1000;
            const wait = Math.max(reset - Date.now(), 5000);
            const seconds = Math.ceil(wait / 1000);
            console.warn(
              `Rate limit hit. Sleeping for ${seconds}s before retrying ${method} ${pathname}`,
            );
            await sleep(wait);
            try {
              const retry = await gh(pathname, { method, body, accept });
              resolve(retry);
            } catch (retryErr) {
              reject(retryErr);
            }
            return;
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const message = raw || res.statusMessage;
            reject(
              new Error(`${res.statusCode} ${res.statusMessage}: ${message}`),
            );
            return;
          }
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ data, headers: res.headers });
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function fetchExistingTitles() {
  const titles = new Set();
  let page = 1;
  const labelFilter = encodeURIComponent('program/release-train,type/chore');
  while (true) {
    const { data } = await gh(
      `/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${page}&labels=${labelFilter}`,
    );
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }
    for (const issue of data) {
      if (issue && !issue.pull_request && issue.title) {
        titles.add(issue.title);
      }
    }
    page += 1;
    await sleep(200);
  }
  console.log(`Preloaded ${titles.size} existing issue titles.`);
  return titles;
}

async function addToProject(nodeId) {
  if (!ADD_TO_PROJECT || !nodeId) {
    return;
  }
  const mutation = {
    query: `mutation($projectId:ID!, $contentId:ID!){
      addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) { item { id } }
    }`,
    variables: { projectId: PROJECT_ID, contentId: nodeId },
  };
  await gh('/graphql', {
    method: 'POST',
    body: mutation,
    accept: 'application/json',
  });
}

async function processEntries(entries, existingTitles, label = 'entries') {
  let created = 0;
  let skipped = 0;
  let index = 0;
  for (const entry of entries) {
    index += 1;
    if (!entry.title) {
      skipped += 1;
      continue;
    }
    if (existingTitles.has(entry.title)) {
      skipped += 1;
      continue;
    }
    const payload = {
      title: entry.title,
      body: entry.body || '',
      labels: Array.isArray(entry.labels) ? entry.labels : [],
    };
    if (Array.isArray(entry.assignees) && entry.assignees.length > 0) {
      payload.assignees = entry.assignees;
    }
    if (entry.milestone) {
      payload.milestone = entry.milestone;
    }
    let attempts = 0;
    while (true) {
      attempts += 1;
      try {
        const { data } = await gh(`/repos/${OWNER}/${REPO}/issues`, {
          method: 'POST',
          body: payload,
        });
        existingTitles.add(entry.title);
        created += 1;
        if (
          entry.state &&
          entry.state.toLowerCase() === 'closed' &&
          data &&
          data.number
        ) {
          await gh(`/repos/${OWNER}/${REPO}/issues/${data.number}`, {
            method: 'PATCH',
            body: { state: 'closed' },
          });
        }
        if (data && data.node_id) {
          await addToProject(data.node_id);
        }
        if ((created + skipped) % 50 === 0) {
          console.log(
            `   Progress ${created}/${entries.length} created (${skipped} skipped)`,
          );
        }
        break;
      } catch (err) {
        const message = err.message || '';
        if (message.includes('secondary rate limit') && attempts < 10) {
          const backoff = Math.min(
            SECONDARY_BACKOFF_BASE_MS * attempts,
            SECONDARY_BACKOFF_MAX_MS,
          );
          console.warn(
            `   Secondary rate limit encountered for "${entry.title}". Sleeping ${Math.ceil(
              backoff / 1000,
            )}s (attempt ${attempts})`,
          );
          await sleep(backoff);
          continue;
        }
        console.error(
          `   Error creating issue for "${entry.title}": ${message}`,
        );
        skipped += 1;
        break;
      }
    }
    if (SLEEP_MS > 0) {
      await sleep(SLEEP_MS);
    }
  }
  return { created, skipped, total: entries.length, label };
}

async function main() {
  const csvEntries = loadEntriesFromCsv();
  let sources;

  if (Array.isArray(csvEntries)) {
    const endSlice = Number.isFinite(END_INDEX) ? END_INDEX : undefined;
    const selectedEntries = csvEntries.slice(START_INDEX - 1, endSlice);
    if (selectedEntries.length === 0) {
      console.log(
        `No CSV rows selected. Check START_BATCH/END_BATCH values (current range ${START_INDEX}-${END_INDEX}).`,
      );
      return;
    }
    console.log(
      `Processing ${selectedEntries.length} CSV rows (range ${START_INDEX}-${Number.isFinite(END_INDEX) ? END_INDEX : csvEntries.length}).`,
    );
    sources = [{ label: 'CSV rows', entries: selectedEntries }];
  } else {
    if (!fs.existsSync(BATCH_DIR)) {
      console.error(`Batch directory not found: ${BATCH_DIR}`);
      process.exit(1);
    }

    const batches = fs
      .readdirSync(BATCH_DIR)
      .filter((f) => /^batch_\d+\.json$/.test(f))
      .sort((a, b) => a.localeCompare(b));

    const selected = batches.filter((_, idx) => {
      const batchNumber = idx + 1;
      return batchNumber >= START_INDEX && batchNumber <= END_INDEX;
    });

    if (selected.length === 0) {
      console.log('No batches selected. Check START_BATCH/END_BATCH values.');
      return;
    }

    console.log(
      `Processing ${selected.length} batch files (range ${START_INDEX}-${END_INDEX}).`,
    );
    sources = selected.map((file) => {
      const filePath = path.join(BATCH_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const entries = JSON.parse(raw);
      return { label: file, entries };
    });
  }

  const existingTitles = await fetchExistingTitles();

  let totalCreated = 0;
  let totalSkipped = 0;
  for (const source of sources) {
    console.log(`\n==> Processing ${source.label}`);
    const result = await processEntries(
      source.entries,
      existingTitles,
      source.label,
    );
    console.log(
      `   ${result.label} summary: created ${result.created}, skipped ${result.skipped}, total ${result.total}`,
    );
    totalCreated += result.created;
    totalSkipped += result.skipped;
  }
  console.log(
    `\nDone. Created ${totalCreated} issues, skipped ${totalSkipped} (existing or invalid).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
