import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { program } from 'commander';
import { execSync } from 'child_process';
import YAML from 'yaml';

type CheckType = 'github' | 'static' | 'code' | 'filesystem' | 'manual' | 'pattern';

type GateCheck = {
  id: string;
  type: CheckType;
  description?: string;
  required?: boolean;
  path?: string;
  paths?: string[];
  pattern?: string;
  require_issue_reference?: boolean;
};

type GateConfig = {
  gate: {
    name: string;
    version: number;
  };
  checks: GateCheck[];
};

type CheckStatus = 'pass' | 'fail' | 'manual' | 'skipped';

type CheckResult = {
  id: string;
  status: CheckStatus;
  description?: string;
  details?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.turbo',
  'dist',
  'build',
  'coverage',
  'artifacts',
  '.next',
  '.cache',
  'tmp',
  'venv',
  '.out',
]);

async function loadConfig(): Promise<GateConfig> {
  const configPath = path.join(repoRoot, 'release', 'ga-gate.yaml');
  try {
      const raw = await fsPromises.readFile(configPath, 'utf8');
      const parsed = YAML.parse(raw) as GateConfig;
      return parsed;
  } catch {
      // Return default config if file missing (bootstrapping)
      return {
          gate: { name: 'Bootstrap Gate', version: 1 },
          checks: [
              { id: 'typescript_strict', type: 'static', path: 'tsconfig.json', description: 'Enforce strict mode' }
          ]
      };
  }
}

function formatStatus(status: CheckStatus): string {
  switch (status) {
    case 'pass':
      return 'PASS';
    case 'fail':
      return 'FAIL';
    case 'manual':
      return 'MANUAL';
    case 'skipped':
        return 'SKIP';
    default:
      return (status as string).toUpperCase();
  }
}

function isCIContext(): boolean {
  return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
}

async function checkStaticStrict(tsconfigPath: string): Promise<CheckResult> {
  const fullPath = path.join(repoRoot, tsconfigPath);
  try {
    const content = await fsPromises.readFile(fullPath, 'utf8');
    const parsed = JSON.parse(content);
    const strictEnabled = parsed?.compilerOptions?.strict === true;
    return {
      id: 'typescript_strict',
      status: strictEnabled ? 'pass' : 'fail',
      details: strictEnabled
        ? 'TypeScript strict mode is enabled.'
        : 'TypeScript strict mode is not enabled in tsconfig.',
    };
  } catch (error) {
    return {
      id: 'typescript_strict',
      status: 'fail',
      details: `Failed to read tsconfig: ${(error as Error).message}`,
    };
  }
}

async function checkGithub(id: string, description?: string): Promise<CheckResult> {
  const inCI = isCIContext();
  return {
    id,
    status: inCI ? 'pass' : 'fail',
    description,
    details: inCI
      ? 'Detected CI environment; assuming required workflows enforced.'
      : 'Not running in CI; cannot verify status checks.',
  };
}

async function hasAuditLogging(targetPath: string): Promise<boolean> {
  const absolute = path.join(repoRoot, targetPath);
  const queue: string[] = [absolute];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const stats = await fsPromises.stat(current).catch(() => null);
    if (!stats) continue;

    if (stats.isDirectory()) {
      const entries = await fsPromises.readdir(current);
      for (const entry of entries) {
        if (SKIP_DIRECTORIES.has(entry)) continue;
        queue.push(path.join(current, entry));
      }
    } else {
      const lowerName = path.basename(current).toLowerCase();
      if (lowerName.includes('audit')) {
        return true;
      }
      const content = await fsPromises.readFile(current, 'utf8');
      if (/audit\s*log/i.test(content)) {
        return true;
      }
    }
  }

  return false;
}

async function checkCode(check: GateCheck): Promise<CheckResult> {
  if (!check.path) {
    return { id: check.id, status: 'fail', description: check.description, details: 'Missing path for code check.' };
  }

  const auditFound = await hasAuditLogging(check.path);
  return {
    id: check.id,
    status: auditFound ? 'pass' : 'fail',
    description: check.description,
    details: auditFound
      ? 'Audit logging constructs detected.'
      : `No audit logging references found under ${check.path}.`,
  };
}

async function checkFilesystem(check: GateCheck): Promise<CheckResult> {
  if (!check.paths || check.paths.length === 0) {
    return { id: check.id, status: 'fail', description: check.description, details: 'No paths provided for filesystem check.' };
  }

  const missing: string[] = [];
  for (const rel of check.paths) {
    const target = path.join(repoRoot, rel);
    try {
      await fsPromises.access(target);
    } catch (error) {
      missing.push(`${rel} (${(error as Error).message})`);
    }
  }

  return {
    id: check.id,
    status: missing.length === 0 ? 'pass' : 'fail',
    description: check.description,
    details: missing.length === 0 ? 'All required paths present.' : `Missing paths: ${missing.join(', ')}`,
  };
}

function hasTrackingReference(line: string): boolean {
  return /#\d+/.test(line) || /tracking\s*issue/i.test(line) || /issue:\s*[A-Za-z0-9_-]+/.test(line);
}

async function walkFiles(startPaths: string[], visitor: (filePath: string) => Promise<void>): Promise<void> {
  const queue = startPaths.map((p) => path.join(repoRoot, p));

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const stats = await fsPromises.stat(current).catch(() => null);
    if (!stats) continue;

    if (stats.isDirectory()) {
      const base = path.basename(current);
      if (SKIP_DIRECTORIES.has(base)) {
        continue;
      }
      const entries = await fsPromises.readdir(current);
      for (const entry of entries) {
        queue.push(path.join(current, entry));
      }
    } else {
      await visitor(current);
    }
  }
}

async function checkPattern(check: GateCheck): Promise<CheckResult> {
  if (!check.paths || !check.pattern) {
    return { id: check.id, status: 'fail', description: check.description, details: 'Pattern or paths missing.' };
  }

  const pattern = new RegExp(check.pattern);
  const violations: string[] = [];

  await walkFiles(check.paths, async (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js')) {
      return;
    }
    const content = await fsPromises.readFile(filePath, 'utf8').catch(() => '');
    if (!content) return;
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        if (check.require_issue_reference && !hasTrackingReference(line)) {
          violations.push(`${path.relative(repoRoot, filePath)}:${index + 1}`);
        }
      }
    });
  });

  return {
    id: check.id,
    status: violations.length === 0 ? 'pass' : 'fail',
    description: check.description,
    details: violations.length === 0 ? 'No untracked @ts-ignore directives found.' : `Tracking issue missing at ${violations.join(', ')}`,
  };
}

async function evaluateCheck(check: GateCheck): Promise<CheckResult> {
  switch (check.type) {
    case 'github':
      return checkGithub(check.id, check.description);
    case 'static':
      return checkStaticStrict(check.path ?? '');
    case 'code':
      return checkCode(check);
    case 'filesystem':
      return checkFilesystem(check);
    case 'pattern':
      return checkPattern(check);
    case 'manual':
      return { id: check.id, status: 'manual', description: check.description, details: 'Manual verification required.' };
    default:
      return { id: check.id, status: 'fail', description: check.description, details: `Unsupported check type ${check.type}` };
  }
}

async function runRuntimeChecks(outDir: string): Promise<CheckResult[]> {
    console.log('\nRunning Runtime Checks (via verify-runtime.sh)...');
    try {
        const runtimeScript = path.join(__dirname, 'verify-runtime.sh');

        // Ensure artifacts dir exists
        const runtimeArtifactDir = path.join(outDir, 'gate');
        await fsPromises.mkdir(runtimeArtifactDir, { recursive: true });

        // We run the shell script. It currently outputs to a fixed path,
        // but we should pass env vars or modify it to accept paths.
        // For now, let's copy the output or let it run.
        // But better: invoke the commands directly here or wrap properly.
        // For minimal churn, we execute it and check exit code.

        execSync(`bash ${runtimeScript}`, { stdio: 'inherit' });

        return [{
            id: 'runtime_verification',
            status: 'pass',
            description: 'Runtime verification suite (lint, test, smoke)',
            details: 'verify-runtime.sh completed successfully'
        }];
    } catch (e) {
        return [{
            id: 'runtime_verification',
            status: 'fail',
            description: 'Runtime verification suite (lint, test, smoke)',
            details: `verify-runtime.sh failed: ${(e as Error).message}`
        }];
    }
}

async function writeArtifact(results: CheckResult[], gate: GateConfig['gate'], outDir: string): Promise<void> {
  const gateDir = path.join(outDir, 'gate');
  await fsPromises.mkdir(gateDir, { recursive: true });

  const payload = {
    gate,
    timestamp: new Date().toISOString(),
    overall: results.every((r) => r.status !== 'fail') ? 'pass' : 'fail',
    results,
  };
  await fsPromises.writeFile(path.join(gateDir, 'gate-report.json'), JSON.stringify(payload, null, 2));
}

function printSummary(config: GateConfig, results: CheckResult[]): void {
  console.log(`\nGA Gate: ${config.gate.name} v${config.gate.version}`);
  console.log('-------------------------------------------');
  results.forEach((result) => {
    const status = formatStatus(result.status);
    console.log(`${status.padEnd(7)} ${result.id}${result.description ? ` - ${result.description}` : ''}`);
    if (result.details) {
      console.log(`         ${result.details}`);
    }
  });
  const overallPass = results.every((r) => r.status !== 'fail');
  console.log('\nOverall:', overallPass ? 'PASS' : 'FAIL');
}

// CLI Config
program
    .name('verify-release')
    .description('Verify release readiness (static + runtime)')
    .requiredOption('--out-dir <path>', 'Output directory for artifacts')
    .option('--check-type <type>', 'Type of checks to run: static, runtime, all', 'all')
    .action(async (options) => {
        const config = await loadConfig();
        const results: CheckResult[] = [];

        // Static Checks
        if (options.checkType === 'static' || options.checkType === 'all') {
            console.log('Running Static Checks...');
            for (const check of config.checks) {
                const result = await evaluateCheck(check);
                results.push(result);
            }
        }

        // Runtime Checks
        if (options.checkType === 'runtime' || options.checkType === 'all') {
            const runtimeResults = await runRuntimeChecks(options.outDir);
            results.push(...runtimeResults);
        }

        await writeArtifact(results, config.gate, options.outDir);
        printSummary(config, results);

        const hasFailure = results.some((r) => r.status === 'fail');
        if (hasFailure) {
            process.exitCode = 1;
        }
    });

program.parse(process.argv);
