import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const RULES = {
  NO_NETWORK_LISTEN: {
    id: 'NO_NETWORK_LISTEN',
    pattern: /(\.listen\s*\()/g,
    requiredContext: 'process.env.NO_NETWORK_LISTEN',
    message: 'Port binding must be gated by process.env.NO_NETWORK_LISTEN',
    extensions: ['.ts', '.js'],
    level: 'error',
  },
  UNBOUNDED_INTERVAL: {
    id: 'UNBOUNDED_INTERVAL',
    pattern: /(setInterval\s*\()/g,
    requiredContext: 'clearInterval',
    message: 'setInterval must have a corresponding clearInterval or be disabled in tests',
    extensions: ['.ts', '.js'],
    level: 'warning', // Warning for now as heuristic is weak
  },
  RESOURCE_LEAK_QUEUE: {
    id: 'RESOURCE_LEAK_QUEUE',
    pattern: /(new\s+Queue\s*\()/g,
    requiredContext: 'close', // Simple heuristic for teardown
    message: 'Queue instantiation detected. Ensure .close() or .quit() is called in teardown.',
    extensions: ['.ts', '.js'],
    level: 'warning',
  },
  RESOURCE_LEAK_REDIS: {
    id: 'RESOURCE_LEAK_REDIS',
    pattern: /(createClient\s*\()/g,
    requiredContext: 'quit',
    message: 'Redis client creation detected. Ensure .quit() or .disconnect() is called.',
    extensions: ['.ts', '.js'],
    level: 'warning',
  },
};

function getChangedFiles(base = 'origin/main', head = 'HEAD') {
  try {
    const diff = execSync(`git diff --name-only ${base} ${head}`, { encoding: 'utf-8' });
    return diff.split('\n').filter(Boolean).map(f => f.trim());
  } catch (error) {
    console.warn(`${YELLOW}Warning: Could not get git diff. Falling back to checking all staged files.${RESET}`);
    try {
        const diff = execSync(`git diff --name-only --cached`, { encoding: 'utf-8' });
        return diff.split('\n').filter(Boolean).map(f => f.trim());
    } catch (e) {
        console.error(`${RED}Error: Could not determine changed files. Please ensure you are in a git repository.${RESET}`);
        process.exit(1);
    }
  }
}

function checkFile(filepath) {
  if (!fs.existsSync(filepath)) return [];

  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  Object.values(RULES).forEach(rule => {
    if (!rule.extensions.some(ext => filepath.endsWith(ext))) return;

    // Quick content check
    if (!content.match(rule.pattern)) return;

    lines.forEach((line, index) => {
      // Check for suppression
      if (line.includes(`reliability-lint: disable ${rule.id}`)) return;
      if (index > 0 && lines[index-1].includes(`reliability-lint: disable ${rule.id}`)) return;

      const match = line.match(rule.pattern);
      if (match) {
        // Heuristic: Check if the file contains the required context string anywhere
        // This is very naive. A better check would be proximity or scope, but for now strict gating is what we want for listen.
        // For listen, we demand explicit check in the file.

        let valid = false;

        if (rule.id === 'NO_NETWORK_LISTEN') {
          // For network listen, we want to see the environment variable check nearby or wrapping it.
          // Or just present in the file is a loose proxy, but "nearby" is better.
          // Let's stick to: if the line itself doesn't have it, and it's not in the previous few lines...
          // Actually, let's keep it simple: If the file doesn't mention NO_NETWORK_LISTEN, it's a violation.
          if (content.includes(rule.requiredContext)) {
             valid = true;
          }
        } else {
           // For others, just existence of teardown method in file is a loose check
           if (content.includes(rule.requiredContext)) {
             valid = true;
           }
        }

        if (!valid) {
          violations.push({
            rule,
            line: index + 1,
            content: line.trim()
          });
        }
      }
    });
  });

  return violations;
}

function main() {
  const args = process.argv.slice(2);
  const base = args[0] || 'origin/main';
  const head = args[1] || 'HEAD';

  console.log(`${YELLOW}Running Reliability Lint (Drift Prevention) against ${base}...${RESET}`);

  const files = getChangedFiles(base, head);
  let errorCount = 0;
  let warningCount = 0;

  files.forEach(file => {
    // Ignore deleted files
    if (!fs.existsSync(file)) return;
    // Ignore this script
    if (file.endsWith('reliability-lints.ts')) return;

    // Scan
    const violations = checkFile(file);

    if (violations.length > 0) {
      console.log(`\n📄 ${file}`);
      violations.forEach(v => {
        const color = v.rule.level === 'error' ? RED : YELLOW;
        const levelIcon = v.rule.level === 'error' ? '❌' : '⚠️';
        console.log(`  ${levelIcon} ${color}Line ${v.line}: ${v.rule.message}${RESET}`);
        console.log(`     Code: ${v.content}`);

        if (v.rule.level === 'error') errorCount++;
        else warningCount++;
      });
    }
  });

  console.log('\n--- Summary ---');
  if (errorCount > 0) {
    console.log(`${RED}FAILED: ${errorCount} errors found.${RESET}`);
    console.log(`Remediation: See docs/ops/RELIABILITY_POLICY.md`);
    console.log(`To suppress: // reliability-lint: disable <RULE_ID> -- reason`);
    process.exit(1);
  } else {
    console.log(`${GREEN}PASSED. ${warningCount} warnings.${RESET}`);
    process.exit(0);
  }
}

main();
