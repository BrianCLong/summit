#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Assume running from repo root usually, but calculate fallback
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.cwd();

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(msg: string, color: string = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function error(msg: string) {
  console.error(`${RED}ERROR: ${msg}${RESET}`);
  process.exit(1);
}

// Commands
async function listRunbooks() {
  const runbooksDir = path.join(REPO_ROOT, 'docs/runbooks');
  log(`Listing runbooks in ${runbooksDir}`, BLUE);
  try {
    const files = fs.readdirSync(runbooksDir).filter(f => f.endsWith('.md'));
    files.forEach(f => log(`- ${f}`));
  } catch (e: any) {
    error(`Failed to list runbooks: ${e.message}`);
  }
}

async function checkGovernance() {
  log(`Checking Governance Artifacts in ${REPO_ROOT}...`, BLUE);
  const checks = [
    'docs/governance',
    'docs/GOVERNANCE.md',
    'CODEOWNERS'
  ];

  let passed = true;
  for (const check of checks) {
    const p = path.join(REPO_ROOT, check);
    if (fs.existsSync(p)) {
      log(`[PASS] ${check}`, GREEN);
    } else {
      log(`[FAIL] ${check} missing (at ${p})`, RED);
      passed = false;
    }
  }

  if (!passed) process.exit(1);
}

async function simulateDr() {
  log('Running DR Simulation...', BLUE);
  const drScript = path.join(REPO_ROOT, 'tests/dr/simulate_agent_failure.ts');
  if (!fs.existsSync(drScript)) {
    error(`DR Script not found: ${drScript}`);
  }

  const child = spawn('npx', ['tsx', drScript], { stdio: 'inherit', cwd: REPO_ROOT });
  child.on('close', (code) => {
    if (code === 0) {
      log('DR Simulation Passed', GREEN);
    } else {
      error('DR Simulation Failed');
    }
  });
}

async function mcpContext(query: string) {
  log(`MCP Context Search: "${query}"`, BLUE);

  // Cross-platform JS search (Thin Slice: Docs only)
  const searchDir = path.join(REPO_ROOT, 'docs');

  function scan(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(query)) {
              console.log(JSON.stringify({
                type: 'context',
                file: path.relative(REPO_ROOT, fullPath),
                line: i + 1,
                content: lines[i].trim().substring(0, 200)
              }));
              if (Math.random() > 0.9) return; // Limit output loosely
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  scan(searchDir);
}

// Main Dispatch
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    log('Usage: summitctl <command> [subcommand] [args]', BLUE);
    log('Commands:');
    log('  runbook list');
    log('  governance check');
    log('  dr simulate');
    log('  mcp context <query>');
    process.exit(1);
  }

  const [cmd, sub, ...rest] = args;

  if (cmd === 'runbook' && sub === 'list') {
    await listRunbooks();
  } else if (cmd === 'governance' && sub === 'check') {
    await checkGovernance();
  } else if (cmd === 'dr' && sub === 'simulate') {
    await simulateDr();
  } else if (cmd === 'mcp' && sub === 'context') {
    await mcpContext(rest.join(' '));
  } else {
    error(`Unknown command: ${cmd} ${sub || ''}`);
  }
}

main().catch(err => error(err.message));
