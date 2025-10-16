#!/usr/bin/env node
// Generate GitHub/Jira importer JSON from CSV backlog
import fs from 'fs';

const csvPath =
  process.argv[2] || 'project_management/backlog/maestro_backlog.csv';
const csv = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const [header, ...rows] = csv;
const cols = header.split(',');
function parseRow(line) {
  const parts = [];
  let cur = '',
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === ',' && !inQ) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  parts.push(cur);
  return parts;
}
const issues = rows.map((r) => {
  const arr = parseRow(r);
  const obj = Object.fromEntries(
    cols.map((c, i) => [c.trim(), (arr[i] || '').trim()]),
  );
  return obj;
});
// GitHub importer format
const gh = issues.map((it) => ({
  title: `[${it['Epic']}] ${it['Issue']}`,
  body: `AC: ${it['AC']}`,
  labels: (it['Label'] || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean),
}));
// Jira minimal format
const jira = issues.map((it) => ({
  fields: {
    summary: `[${it['Epic']}] ${it['Issue']}`,
    description: it['AC'] || '',
    issuetype: { name: 'Task' },
    priority: { name: it['Priority'] || 'Medium' },
  },
}));
fs.writeFileSync(
  'project_management/backlog/github_issues.json',
  JSON.stringify(gh, null, 2),
);
fs.writeFileSync(
  'project_management/backlog/jira_issues.json',
  JSON.stringify(jira, null, 2),
);
console.log('Wrote github_issues.json and jira_issues.json');
