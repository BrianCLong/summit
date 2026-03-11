#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { analyzeRepository, formatReport, materializeRepository } from './analyze.js';

async function run() {
  const [command, source] = process.argv.slice(2);

  if (command !== 'analyze' || !source) {
    console.error('Usage: summit-intel analyze <local-repo-path|github-url|git-url>');
    process.exitCode = 1;
    return;
  }

  const { repoPath, cleanup } = await materializeRepository(source);

  try {
    await access(repoPath, constants.R_OK);
    const summary = await analyzeRepository(repoPath);
    console.log(formatReport(source, summary));
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error(`summit-intel failed: ${error.message}`);
  process.exitCode = 1;
});
