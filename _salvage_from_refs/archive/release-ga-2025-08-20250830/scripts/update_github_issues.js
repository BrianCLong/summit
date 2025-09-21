#!/usr/bin/env node
/* eslint-disable no-console */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = process.env.OWNER;
const REPO = process.env.REPO;
if (!OWNER || !REPO) {
  console.error('Set OWNER and REPO env vars');
  process.exit(1);
}

const csvPath = process.argv[2] || 'project_management/issues_enriched.csv';
const abs = path.resolve(csvPath);
const text = fs.readFileSync(abs, 'utf8');

function parseCSV(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  const rows = [];
  for (const line of lines) {
    const fields = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQ = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQ = true;
        } else if (ch === ',') {
          fields.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    fields.push(cur);
    if (fields.length >= 6) rows.push(fields);
  }
  return rows;
}

function sh(cmd) {
  return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

const rows = parseCSV(text);
for (const [TITLE, BODY, LABELS, ASSIGNEES, STATE, MILESTONE] of rows) {
  const title = TITLE.trim().replace(/^"|"$/g, '');
  const body = BODY.trim().replace(/^"|"$/g, '');
  const labels = LABELS
    ? LABELS.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const assignees = ASSIGNEES
    ? ASSIGNEES.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const state = (STATE || 'open').trim();
  const milestone = (MILESTONE || '').trim();

  console.log(`Syncing: ${title}`);
  let number = '';
  try {
    const out = sh(
      `gh issue list --search ${JSON.stringify(title + ' in:title')} --state all --json number,title --repo ${OWNER}/${REPO}`,
    );
    const arr = JSON.parse(out);
    const found = arr.find((i) => i.title === title);
    number = found ? String(found.number) : '';
  } catch {}

  if (number) {
    let cmd = `gh issue edit ${number} --repo ${OWNER}/${REPO}`;
    if (labels.length) cmd += labels.map((l) => ` --add-label ${JSON.stringify(l)}`).join('');
    // Normalize assignee to OWNER to avoid username mismatches
    cmd += ` --add-assignee ${JSON.stringify(OWNER)}`;
    if (milestone) cmd += ` --milestone ${JSON.stringify(milestone)}`;
    sh(cmd);
    if (state === 'closed') sh(`gh issue close ${number} --repo ${OWNER}/${REPO}`);
  } else {
    let cmd = `gh issue create --repo ${OWNER}/${REPO} --title ${JSON.stringify(title)} --body ${JSON.stringify(body)}`;
    if (labels.length) cmd += ` --label ${JSON.stringify(labels.join(','))}`;
    const desired = assignees.length ? assignees : [OWNER];
    const finalAssignees = desired.filter((a) => a && a.toLowerCase() === OWNER.toLowerCase());
    const assigneesFinal = (finalAssignees.length ? finalAssignees : [OWNER]).join(',');
    cmd += ` --assignee ${JSON.stringify(assigneesFinal)}`;
    if (milestone) cmd += ` --milestone ${JSON.stringify(milestone)}`;
    const created = sh(cmd);
    console.log(created);
    // Cannot reliably parse number here without API; skip close on create.
  }
}
console.log('Issue sync complete.');
