#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface CliOptions {
  command: 'plan' | 'dry-run' | 'execute';
  host: string;
  port: number;
  input: string;
  output?: string;
}

const HELP_TEXT = `pcbo <command> [options]\n\nCommands:\n  plan       Generate the deterministic partition plan\n  dry-run    Evaluate the dry-run diff with policy gates\n  execute    Run the backfill and emit proofs/reports\n\nOptions:\n  --host <host>     Orchestrator host (default: localhost)\n  --port <port>     Orchestrator port (default: 8080)\n  --input <file>    Path to JSON request payload (required)\n  --output <file>   Optional file to write the response\n  --help            Show this help message\n`;

function parseArgs(argv: string[]): CliOptions | null {
  if (argv.length === 0) {
    return null;
  }
  const [command, ...rest] = argv;
  if (!['plan', 'dry-run', 'execute'].includes(command)) {
    return null;
  }
  const options: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 1) {
    const key = rest[i];
    if (!key.startsWith('--')) {
      throw new Error(`unexpected argument: ${key}`);
    }
    const value = rest[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${key}`);
    }
    options[key.slice(2)] = value;
    i += 1;
  }
  if (!options.input) {
    throw new Error('missing required option --input');
  }
  const host = options.host ?? 'localhost';
  const port = options.port ? Number.parseInt(options.port, 10) : 8080;
  if (Number.isNaN(port)) {
    throw new Error('port must be a number');
  }
  return {
    command: command as CliOptions['command'],
    host,
    port,
    input: resolve(options.input),
    output: options.output ? resolve(options.output) : undefined,
  };
}

async function main(): Promise<void> {
  try {
    const parsed = parseArgs(process.argv.slice(2));
    if (!parsed) {
      process.stdout.write(HELP_TEXT);
      process.exit(0);
      return;
    }
    const payload = JSON.parse(readFileSync(parsed.input, 'utf8'));
    const endpoint = parsed.command === 'dry-run' ? 'dry-run' : parsed.command;
    const url = new URL(`/v1/${endpoint}`, `http://${parsed.host}:${parsed.port}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let parsedBody: unknown;
    try {
      parsedBody = text.length ? JSON.parse(text) : {};
    } catch (error) {
      throw new Error(`failed to parse orchestrator response: ${(error as Error).message}`);
    }

    const serialized = JSON.stringify(parsedBody, null, 2);
    if (parsed.output) {
      writeFileSync(parsed.output, `${serialized}\n`);
    } else {
      process.stdout.write(`${serialized}\n`);
    }

    if (!response.ok) {
      const violations = (parsedBody as { report?: { policyViolations?: unknown } }).report?.policyViolations;
      if (Array.isArray(violations) && violations.length > 0) {
        process.stderr.write('policy violations detected:\n');
        process.stderr.write(`${JSON.stringify(violations, null, 2)}\n`);
      }
      process.exit(2);
    }
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    process.stderr.write(HELP_TEXT);
    process.exit(1);
  }
}

void main();
