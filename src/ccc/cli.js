#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { compileFromFile, compilePolicy, parsePolicy } from './compiler.js';
import { parseSimpleYaml } from './simple-yaml.js';
import { lintPolicy } from './linter.js';
import { evaluateCalls, formatPlaygroundResults } from './playground.js';

function printUsage() {
  console.log('Consent-Constraint Compiler');
  console.log('Usage:');
  console.log('  node src/ccc/cli.js compile <policy.yaml> <outputDir>');
  console.log('  node src/ccc/cli.js lint <policy.yaml>');
  console.log('  node src/ccc/cli.js playground <policy.yaml> <calls.yaml>');
}

async function run() {
  const [, , command, ...rest] = process.argv;

  if (!command || ['-h', '--help'].includes(command)) {
    printUsage();
    return;
  }

  if (command === 'compile') {
    const [policyPath, outputDir = 'generated/ccc'] = rest;
    if (!policyPath) {
      throw new Error('compile requires a policy file path');
    }
    const compiled = await compileFromFile(policyPath, outputDir);
    console.log(`Compiled policy version ${compiled.version} into ${outputDir}`);
    return;
  }

  if (command === 'lint') {
    const [policyPath] = rest;
    if (!policyPath) {
      throw new Error('lint requires a policy file path');
    }
    const content = await fs.readFile(policyPath, 'utf8');
    const parsed = parsePolicy(content);
    const issues = lintPolicy(parsed);
    if (!issues.length) {
      console.log('No issues found.');
      return;
    }
    for (const issue of issues) {
      const scope = issue.clause ? ` [${issue.clause}]` : '';
      console.log(`${issue.level.toUpperCase()}:${scope} ${issue.message}`);
    }
    return;
  }

  if (command === 'playground') {
    const [policyPath, callsPath] = rest;
    if (!policyPath || !callsPath) {
      throw new Error('playground requires a policy file and an API calls descriptor');
    }
    const policyRaw = await fs.readFile(policyPath, 'utf8');
    const parsed = parsePolicy(policyRaw);
    const compiled = compilePolicy(parsed);
    const callsRaw = await fs.readFile(callsPath, 'utf8');
    const callsDoc = path.extname(callsPath).endsWith('.json')
      ? JSON.parse(callsRaw)
      : parseSimpleYaml(callsRaw);
    if (!callsDoc || typeof callsDoc !== 'object' || !Array.isArray(callsDoc.calls)) {
      throw new Error('Calls descriptor must be an object with an array property `calls`.');
    }
    const calls = callsDoc.calls.map((call) => ({
      name: call.name,
      scope: call.scope,
      purpose: call.purpose,
    }));
    const results = evaluateCalls(compiled, calls);
    console.log(formatPlaygroundResults(results));
    return;
  }

  printUsage();
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
