import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// --- Configuration ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

interface Config {
  mode: 'live' | 'offline';
  fixturesDir?: string;
  outputDir: string;
  failOnP1: boolean;
}

const PARITY_CHAIN = [
  { stage: 'install', command: 'pnpm', args: ['install', '--frozen-lockfile'] },
  { stage: 'lint', command: 'pnpm', args: ['-w', 'run', 'lint'] },
  { stage: 'typecheck', command: 'pnpm', args: ['-w', 'run', 'typecheck'] },
  { stage: 'build', command: 'pnpm', args: ['-w', 'run', 'build'] },
  { stage: 'test', command: 'pnpm', args: ['-w', 'run', 'test'] },
  { stage: 'policy-test', command: 'pnpm', args: ['run', 'test:policy'] },
  {
    stage: 'prod-guard',
    command: 'npx',
    args: ['tsx', 'scripts/ci/prod-config-check.ts']
  },
];

const SIGNATURES = {
  P0: [
    /ERR_MODULE_NOT_FOUND/,
    /Command failed with exit code/, // Generic capture for non-0 exit
    /Type error:/,
    /TypeScript error/,
    /FAIL/,
  ],
  P1: [
    /Error: Duplicate metric/, // prom-client duplicate metric
    /ECONNREFUSED/, // Network attempts
    /ETIMEDOUT/,
    /Jest did not exit one second after the test run has completed/, // Open handles
    /ReferenceError: require is not defined/, // ESM/CJS issues
    /SyntaxError: Cannot use import statement outside a module/,
  ]
};

// --- Helpers ---

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const modeArg = args.find(a => a.startsWith('--mode='));
  const mode = modeArg ? (modeArg.split('=')[1] as 'live' | 'offline') : 'live';

  const fixturesArg = args.find(a => a.startsWith('--fixturesDir='));
  const fixturesDir = fixturesArg ? path.resolve(ROOT_DIR, fixturesArg.split('=')[1]) : undefined;

  const failOnP1Arg = args.find(a => a.startsWith('--fail-on-p1='));
  // Default to true if not specified, or parse value
  const failOnP1 = failOnP1Arg ? failOnP1Arg.split('=')[1] === 'true' : true;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(ROOT_DIR, 'evidence', 'release-preflight', timestamp);

  return { mode, fixturesDir, outputDir, failOnP1 };
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getSystemInfo() {
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
    }
  };
}

async function getGitSha(): Promise<string> {
  return new Promise((resolve) => {
    const p = spawn('git', ['rev-parse', 'HEAD']);
    let data = '';
    p.stdout.on('data', d => data += d.toString());
    p.on('close', () => resolve(data.trim() || 'unknown'));
    p.on('error', () => resolve('unknown'));
  });
}

// --- Execution Engine ---

async function runCommand(cmd: string, args: string[], logFile: string): Promise<number> {
  return new Promise((resolve) => {
    const stream = fs.createWriteStream(logFile);
    console.log(`> Running: ${cmd} ${args.join(' ')}`);

    const p = spawn(cmd, args, {
      cwd: ROOT_DIR,
      env: { ...process.env, FORCE_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    p.stdout.pipe(stream, { end: false });
    p.stderr.pipe(stream, { end: false });

    // Also pipe to console for visibility
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);

    p.on('close', (code) => {
      stream.end();
      resolve(code ?? 1);
    });

    p.on('error', (err) => {
      stream.write(`\nExecution Error: ${err.message}\n`);
      stream.end();
      resolve(1);
    });
  });
}

function scanLogForSignatures(logContent: string) {
  const results = { p0: [] as string[], p1: [] as string[] };

  for (const regex of SIGNATURES.P0) {
    if (regex.test(logContent)) {
      const match = logContent.match(regex);
      if (match) results.p0.push(match[0]);
    }
  }

  for (const regex of SIGNATURES.P1) {
    if (regex.test(logContent)) {
      const match = logContent.match(regex);
      if (match) results.p1.push(match[0]);
    }
  }

  return results;
}

// --- Main ---

async function main() {
  const config = parseArgs();
  console.log(`[Preflight] Mode: ${config.mode}`);
  console.log(`[Preflight] Output: ${config.outputDir}`);
  console.log(`[Preflight] Fail on P1: ${config.failOnP1}`);

  ensureDir(config.outputDir);
  ensureDir(path.join(config.outputDir, 'logs'));

  // 1. Environment Capture
  const gitSha = await getGitSha();
  const envInfo = { ...getSystemInfo(), gitSha };
  fs.writeFileSync(path.join(config.outputDir, 'environment.json'), JSON.stringify(envInfo, null, 2));

  // 2. Inventory (Workspace Scripts)
  let workspaceScripts = {};
  if (config.mode === 'live') {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
      workspaceScripts = pkg.scripts || {};
    } catch (e) {
      console.warn('Failed to read package.json');
    }
  } else if (config.mode === 'offline' && config.fixturesDir) {
    try {
      workspaceScripts = JSON.parse(fs.readFileSync(path.join(config.fixturesDir, 'workspace-scripts.json'), 'utf8'));
    } catch (e) {
      console.warn('Failed to read fixture workspace-scripts.json');
    }
  }
  fs.writeFileSync(path.join(config.outputDir, 'workspace-scripts.json'), JSON.stringify(workspaceScripts, null, 2));

  // 3. Execution / Simulation
  const results = [];
  let exitCode = 0; // 0=OK, 1=P0, 2=P1

  for (const step of PARITY_CHAIN) {
    const logPath = path.join(config.outputDir, 'logs', `${step.stage}.log`);
    let code = 0;

    if (config.mode === 'live') {
      code = await runCommand(step.command, step.args, logPath);
    } else {
      // Offline mode: Copy fixture log
      const fixtureLog = path.join(config.fixturesDir!, `${step.stage}.log`);
      if (fs.existsSync(fixtureLog)) {
        fs.copyFileSync(fixtureLog, logPath);
      } else {
        // We do NOT write a log if it's missing in offline mode, to properly test the "missing fixture" case if needed.
        // Or we write a placeholder.
        fs.writeFileSync(logPath, `[OFFLINE] No fixture found for ${step.stage}`);
      }
    }

    const logContent = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
    const signatures = scanLogForSignatures(logContent);

    if (config.mode === 'offline') {
      if (signatures.p0.length > 0) code = 1;
    }

    // Force P0 signature if exit code was non-zero
    if (code !== 0 && signatures.p0.length === 0) {
      signatures.p0.push(`Process exited with code ${code}`);
    }

    results.push({
      stage: step.stage,
      exitCode: code,
      signatures
    });
  }

  // 4. Analysis & Exit Code Determination
  let hasP0 = false;
  let hasP1 = false;

  for (const res of results) {
    if (res.signatures.p0.length > 0) hasP0 = true;
    if (res.signatures.p1.length > 0) hasP1 = true;
  }

  if (hasP0) exitCode = 1;
  else if (hasP1 && config.failOnP1) exitCode = 2;

  // 5. Artifact Generation
  const summary = {
    timestamp: new Date().toISOString(),
    gitSha,
    mode: config.mode,
    exitCode,
    results
  };
  fs.writeFileSync(path.join(config.outputDir, 'summary.json'), JSON.stringify(summary, null, 2));

  // Markdown Summary
  const md = [
    `# Release Preflight Summary`,
    `**Date:** ${summary.timestamp}`,
    `**Commit:** ${gitSha}`,
    `**Mode:** ${config.mode}`,
    `**Status:** ${exitCode === 0 ? '✅ PASS' : exitCode === 1 ? '🛑 FAIL (P0)' : '⚠️ WARNING (P1)'}`,
    ``,
    `## Stage Results`,
    `| Stage | Status | P0 Issues | P1 Issues |`,
    `|-------|--------|-----------|-----------|`,
    ...results.map(r => {
      const status = r.exitCode === 0 ? '✅' : '❌';
      return `| ${r.stage} | ${status} | ${r.signatures.p0.length} | ${r.signatures.p1.length} |`;
    }),
    ``,
    `## Detected Issues`,
    ...results.flatMap(r => {
      const lines = [];
      if (r.signatures.p0.length > 0) {
        lines.push(`### 🛑 ${r.stage} (P0)`);
        r.signatures.p0.forEach(s => lines.push(`- ${s}`));
      }
      if (r.signatures.p1.length > 0) {
        lines.push(`### ⚠️ ${r.stage} (P1)`);
        r.signatures.p1.forEach(s => lines.push(`- ${s}`));
      }
      return lines;
    })
  ].join('\n');
  fs.writeFileSync(path.join(config.outputDir, 'summary.md'), md);

  console.log(`\n[Preflight] Complete. Evidence saved to: ${config.outputDir}`);
  process.exit(exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
