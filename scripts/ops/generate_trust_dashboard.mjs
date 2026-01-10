#!/usr/bin/env node

/**
 * Trust Dashboard Generator
 *
 * Generates a deterministic markdown report of the repo's trust signals.
 * Usage: node scripts/ops/generate_trust_dashboard.mjs [--snapshot]
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// --- Configuration ---

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');

const SIGNALS = [
  {
    name: 'Repo Cleanliness',
    isHardGate: true,
    run: () => {
      try {
        const output = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf-8' });
        if (output.trim().length === 0) {
          return { status: 'PASS', details: 'Working tree clean.' };
        }
        return { status: 'FAIL', details: 'Uncommitted changes detected.' };
      } catch (e) {
        return { status: 'FAIL', details: `Git check failed: ${e.message}` };
      }
    }
  },
  {
    name: 'Security Ledger',
    isHardGate: true,
    run: () => {
      const ledgerPath = path.join(REPO_ROOT, 'docs/security/FINDINGS_REGISTER.md');
      if (!fs.existsSync(ledgerPath)) {
        return { status: 'FAIL', details: 'Findings register missing.' };
      }
      const content = fs.readFileSync(ledgerPath, 'utf-8');

      const lines = content.split('\n');
      let violations = 0;

      for (const line of lines) {
        if (!line.trim().startsWith('|')) continue;
        if (line.includes('---')) continue; // Separator

        const cols = line.split('|').map(c => c.trim().toLowerCase());
        if (cols.length < 5) continue;

        // Assuming columns: | ID | Severity | Component | Title | Status | Disposition |
        // Severity is index 2, Status index 5 (1-based split, so 0 is empty string before first pipe)

        const severity = cols[2];
        const status = cols[5];

        if (status === 'open' && (severity.includes('critical') || severity.includes('high'))) {
           violations++;
        }
      }

      if (violations === 0) {
        return { status: 'PASS', details: 'No Open Critical/High findings.' };
      }
      return { status: 'FAIL', details: `${violations} Open Critical/High finding(s) detected.` };
    }
  },
  {
    name: 'Assurance Contract',
    isHardGate: true,
    run: () => {
      const p = path.join(REPO_ROOT, 'docs/assurance/ASSURANCE_CONTRACT.md');
      if (fs.existsSync(p) && fs.statSync(p).size > 0) {
        return { status: 'PASS', details: 'Contract exists.' };
      }
      return { status: 'FAIL', details: 'Contract missing or empty.' };
    }
  },
  {
    name: 'Lint Status',
    isHardGate: true,
    run: () => {
      try {
        execSync('pnpm lint', { cwd: REPO_ROOT, stdio: 'ignore' });
        return { status: 'PASS', details: 'Lint checks passed.' };
      } catch (e) {
        return { status: 'FAIL', details: 'Lint checks failed.' };
      }
    }
  },
  {
    name: 'Typecheck Status',
    isHardGate: true,
    run: () => {
      try {
        execSync('pnpm typecheck', { cwd: REPO_ROOT, stdio: 'ignore' });
        return { status: 'PASS', details: 'Typecheck passed.' };
      } catch (e) {
        return { status: 'FAIL', details: 'Typecheck failed.' };
      }
    }
  },
  {
    name: 'Server Unit Tests',
    isHardGate: true,
    run: () => {
      try {
        execSync('pnpm --filter intelgraph-server test:unit', { cwd: REPO_ROOT, stdio: 'ignore' });
        return { status: 'PASS', details: 'Server unit tests passed.' };
      } catch (e) {
        return { status: 'FAIL', details: 'Server unit tests failed.' };
      }
    }
  },
  {
    name: 'Dependency Hygiene',
    isHardGate: true,
    run: () => {
      const packageLock = path.join(REPO_ROOT, 'package-lock.json');
      const pnpmLock = path.join(REPO_ROOT, 'pnpm-lock.yaml');

      if (fs.existsSync(packageLock)) {
        return { status: 'FAIL', details: 'package-lock.json found (should be deleted).' };
      }
      if (!fs.existsSync(pnpmLock)) {
        return { status: 'FAIL', details: 'pnpm-lock.yaml missing.' };
      }
      return { status: 'PASS', details: 'Lockfiles correct.' };
    }
  },
  {
    name: 'Evidence Index',
    isHardGate: false,
    run: () => {
      const p = path.join(REPO_ROOT, 'docs/ops/EVIDENCE_INDEX.md');
      if (fs.existsSync(p)) return { status: 'PASS', details: 'Index exists.' };
      return { status: 'WARN', details: 'Evidence index missing.' };
    }
  },
  {
    name: 'Version Parity',
    isHardGate: true,
    run: () => {
      try {
        const rootPkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
        const serverPkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'server/package.json'), 'utf-8'));

        if (rootPkg.version === serverPkg.version) {
          return { status: 'PASS', details: `Versions match (${rootPkg.version}).` };
        }
        return { status: 'FAIL', details: `Mismatch: Root(${rootPkg.version}) vs Server(${serverPkg.version}).` };
      } catch (e) {
        return { status: 'FAIL', details: `Version check error: ${e.message}` };
      }
    }
  },
  {
    name: 'Banned Patterns',
    isHardGate: true,
    run: () => {
      const banned = ['.env', 'secrets.env'];
      const found = [];
      for (const f of banned) {
        if (fs.existsSync(path.join(REPO_ROOT, f))) found.push(f);
      }

      // Also look for key files in root
      try {
        const files = fs.readdirSync(REPO_ROOT);
        for (const f of files) {
          if (f.endsWith('.key') || (f.endsWith('.pem') && f !== 'root-ca.pem')) {
             found.push(f);
          }
        }
      } catch (e) {}

      if (found.length > 0) {
        return { status: 'FAIL', details: `Banned files found: ${found.join(', ')}` };
      }
      return { status: 'PASS', details: 'No banned files found.' };
    }
  }
];

// --- Main Execution ---

async function main() {
  const args = process.argv.slice(2);
  const isSnapshot = args.includes('--snapshot');

  console.error('Running Trust Dashboard Generator...');

  const results = [];
  let overallStatus = 'PASS';

  for (const signal of SIGNALS) {
    process.stderr.write(`Checking ${signal.name}... `);
    const resultRaw = signal.run();
    const result = { ...resultRaw, name: signal.name };
    results.push(result);
    process.stderr.write(`${result.status}\n`);

    if (result.status === 'FAIL' && signal.isHardGate) {
      overallStatus = 'FAIL';
    } else if (result.status === 'WARN' && overallStatus !== 'FAIL') {
      overallStatus = 'WARN';
    }
  }

  const now = new Date().toISOString();
  let commit = 'unknown';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  } catch (e) {}

  const icon = overallStatus === 'PASS' ? '✅' : (overallStatus === 'WARN' ? '⚠️' : '❌');

  const report = `# Trust Dashboard

**Generated:** ${now}
**Commit:** ${commit}
**Overall Status:** ${icon} ${overallStatus}

| Signal | Status | Details |
| :--- | :--- | :--- |
${results.map(r => {
  const sIcon = r.status === 'PASS' ? '✅' : (r.status === 'WARN' ? '⚠️' : '❌');
  return `| ${r.name} | ${sIcon} ${r.status} | ${r.details} |`;
}).join('\n')}

---
*Generated by scripts/ops/generate_trust_dashboard.mjs*
`;

  if (isSnapshot) {
    const outPath = path.join(REPO_ROOT, 'docs/ops/TRUST_DASHBOARD.md');
    fs.writeFileSync(outPath, report);
    console.error(`Snapshot written to ${outPath}`);
  } else {
    console.log(report);
  }

  if (overallStatus === 'FAIL') {
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
