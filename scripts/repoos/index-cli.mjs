#!/usr/bin/env node
import fs from 'fs/promises';

const indexPath = '.repoos/index/platform-index.json';

function usage() {
  console.log(`Usage:
  index search <type|all> <term>
  index list <type>
  index show <type> <id>`);
}

async function loadIndex() {
  const raw = await fs.readFile(indexPath, 'utf8');
  return JSON.parse(raw);
}

function filterByType(records, type) {
  if (type === 'all') return records;
  return records.filter((record) => record.type === type);
}

function includesTerm(record, term) {
  const haystack = JSON.stringify(record).toLowerCase();
  return haystack.includes(term.toLowerCase());
}

async function main() {
  const [, , cmd, ...args] = process.argv;
  if (!cmd) {
    usage();
    process.exitCode = 1;
    return;
  }

  const index = await loadIndex();
  const records = index.records ?? [];

  if (cmd === 'search') {
    const type = args[0] ?? 'all';
    const term = args.slice(1).join(' ').trim();
    if (!term) {
      console.error('Missing search term.');
      process.exitCode = 1;
      return;
    }

    const matches = filterByType(records, type).filter((record) => includesTerm(record, term));
    console.log(JSON.stringify(matches, null, 2));
    return;
  }

  if (cmd === 'list') {
    const type = args[0];
    if (!type) {
      console.error('Missing asset type.');
      process.exitCode = 1;
      return;
    }

    const list = filterByType(records, type).map(({ id, name, type: recordType }) => ({
      id,
      name,
      type: recordType,
    }));
    console.log(JSON.stringify(list, null, 2));
    return;
  }

  if (cmd === 'show') {
    const [type, id] = args;
    if (!type || !id) {
      console.error('Missing type or id.');
      process.exitCode = 1;
      return;
    }

    const hit = records.find((record) => record.type === type && record.id === id);
    if (!hit) {
      console.error('Asset not found.');
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify(hit, null, 2));
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
