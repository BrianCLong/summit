#!/usr/bin/env node

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const GRAPHQL_QUERY =
  'query($owner:String!,$name:String!,$n:Int!,$after:String){repository(owner:$owner,name:$name){pullRequests(states:OPEN,first:$n,after:$after,orderBy:{field:UPDATED_AT,direction:DESC}){nodes{number title mergeable mergeStateStatus updatedAt reviewDecision isDraft baseRefName labels(first:50){nodes{name}} statusCheckRollup{state} assignees(first:20){nodes{login}}} pageInfo{hasNextPage endCursor}}}}';

function parseArgs(argv) {
  const args = {
    owner: '',
    repo: '',
    output: '',
    pageSize: 25,
    maxPrs: 1000,
    retries: 3,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--owner') args.owner = argv[i + 1] ?? '';
    if (arg === '--repo') args.repo = argv[i + 1] ?? '';
    if (arg === '--output') args.output = argv[i + 1] ?? '';
    if (arg === '--page-size') args.pageSize = Number(argv[i + 1] ?? '25');
    if (arg === '--max-prs') args.maxPrs = Number(argv[i + 1] ?? '1000');
    if (arg === '--retries') args.retries = Number(argv[i + 1] ?? '3');
  }

  if (!args.owner) throw new Error('Missing --owner <github-owner>');
  if (!args.repo) throw new Error('Missing --repo <github-repo>');

  if (!Number.isInteger(args.pageSize) || args.pageSize <= 0 || args.pageSize > 100) {
    throw new Error('--page-size must be an integer between 1 and 100');
  }

  if (!Number.isInteger(args.maxPrs) || args.maxPrs <= 0) {
    throw new Error('--max-prs must be a positive integer');
  }

  if (!Number.isInteger(args.retries) || args.retries < 1) {
    throw new Error('--retries must be >= 1');
  }

  return args;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function parseErrorMessage(error) {
  if (!error) return '';
  if (typeof error.stderr === 'string' && error.stderr.trim()) return error.stderr.trim();
  if (typeof error.message === 'string' && error.message.trim()) return error.message.trim();
  return String(error);
}

function buildGraphqlArgs({ owner, repo, pageSize, cursor }) {
  const args = [
    'api',
    'graphql',
    '-f',
    `query=${GRAPHQL_QUERY}`,
    '-F',
    `owner=${owner}`,
    '-F',
    `name=${repo}`,
    '-F',
    `n=${pageSize}`,
  ];

  if (cursor) {
    args.push('-F', `after=${cursor}`);
  }

  return args;
}

function fetchPage({ owner, repo, pageSize, cursor, retries }) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = execFileSync('gh', buildGraphqlArgs({ owner, repo, pageSize, cursor }), {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const payload = JSON.parse(response);
      return payload.data.repository.pullRequests;
    } catch (error) {
      attempt += 1;
      if (attempt >= retries) {
        const message = parseErrorMessage(error);
        throw new Error(`Failed to fetch PR page after ${retries} attempts: ${message}`);
      }
      sleep(attempt * 500);
    }
  }

  throw new Error('Unreachable fetchPage state');
}

function mapNodeToSnapshot(node) {
  return {
    number: node.number,
    title: node.title,
    mergeable: node.mergeable,
    mergeStateStatus: node.mergeStateStatus,
    updatedAt: node.updatedAt,
    reviewDecision: node.reviewDecision,
    isDraft: node.isDraft,
    baseRefName: node.baseRefName,
    labels: (node.labels?.nodes ?? []).map((label) => label.name).filter(Boolean),
    statusCheckRollup: node.statusCheckRollup?.state
      ? { state: node.statusCheckRollup.state }
      : undefined,
    assignees: (node.assignees?.nodes ?? []).map((assignee) => ({ login: assignee.login })),
  };
}

function exportOpenPrsSnapshot(args) {
  const prs = [];
  let cursor = '';
  let hasNextPage = true;

  while (hasNextPage && prs.length < args.maxPrs) {
    const page = fetchPage({
      owner: args.owner,
      repo: args.repo,
      pageSize: Math.min(args.pageSize, args.maxPrs - prs.length),
      cursor,
      retries: args.retries,
    });

    for (const node of page.nodes ?? []) {
      prs.push(mapNodeToSnapshot(node));
      if (prs.length >= args.maxPrs) break;
    }

    hasNextPage = Boolean(page.pageInfo?.hasNextPage) && prs.length < args.maxPrs;
    cursor = page.pageInfo?.endCursor ?? '';
  }

  return prs;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshot = exportOpenPrsSnapshot(args);

  const output = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (args.output) {
    fs.writeFileSync(args.output, output, 'utf8');
  } else {
    process.stdout.write(output);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildGraphqlArgs, exportOpenPrsSnapshot, mapNodeToSnapshot, parseArgs };
