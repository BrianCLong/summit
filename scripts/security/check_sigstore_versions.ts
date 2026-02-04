import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MIN_SIGSTORE_GO = '1.10.4';
const MIN_SIGSTORE_PY = '4.2.0';

type FindingStatus = 'ok' | 'violation' | 'unparsed' | 'unbounded';

interface VersionFinding {
  package: string;
  file: string;
  version: string;
  source: string;
  constraint?: string;
  status: FindingStatus;
}

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
}

interface Report {
  min_versions: {
    sigstore_go: string;
    sigstore_python: string;
  };
  files_scanned: string[];
  findings: {
    sigstore_go: VersionFinding[];
    sigstore_python: VersionFinding[];
  };
  violations: VersionFinding[];
  status: 'pass' | 'fail';
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token?.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i += 1;
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

function parseVersion(raw: string): ParsedVersion | null {
  const trimmed = raw.trim().replace(/^v/, '');
  if (!trimmed) return null;
  const withoutBuild = trimmed.split('+')[0];
  const [base, preRelease] = withoutBuild.split('-', 2);
  const parts = base.split('.');
  if (parts.length < 3) return null;
  const [major, minor, patch] = parts.slice(0, 3).map((part) => Number(part));
  if ([major, minor, patch].some((value) => Number.isNaN(value))) return null;
  return {
    major,
    minor,
    patch,
    preRelease,
  };
}

function compareVersions(a: string, b: string): number | null {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);
  if (!parsedA || !parsedB) return null;
  if (parsedA.major !== parsedB.major) return parsedA.major - parsedB.major;
  if (parsedA.minor !== parsedB.minor) return parsedA.minor - parsedB.minor;
  if (parsedA.patch !== parsedB.patch) return parsedA.patch - parsedB.patch;
  if (parsedA.preRelease && !parsedB.preRelease) return -1;
  if (!parsedA.preRelease && parsedB.preRelease) return 1;
  return 0;
}

function evaluateVersion(version: string, minVersion: string): FindingStatus {
  const comparison = compareVersions(version, minVersion);
  if (comparison === null) return 'unparsed';
  return comparison < 0 ? 'violation' : 'ok';
}

function listFiles(root: string): string[] {
  try {
    const output = execSync('git ls-files', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 10 * 1024 * 1024,
    });
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch (error) {
    const results: string[] = [];
    const stack = [root];
    const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'artifacts']);
    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (skipDirs.has(entry.name)) continue;
          stack.push(path.join(current, entry.name));
        } else if (entry.isFile()) {
          results.push(path.relative(root, path.join(current, entry.name)));
        }
      }
    }
    return results;
  }
}

function parseGoMod(content: string, file: string): VersionFinding[] {
  const results: VersionFinding[] = [];
  const regex = /^\s*github\.com\/sigstore\/sigstore\s+(v[\w.\-+]+)\s*$/gm;
  let match = regex.exec(content);
  while (match) {
    const version = match[1];
    results.push({
      package: 'github.com/sigstore/sigstore',
      file,
      version,
      source: 'go.mod',
      status: evaluateVersion(version, MIN_SIGSTORE_GO),
    });
    match = regex.exec(content);
  }
  return results;
}

function parseGoSum(content: string, file: string): VersionFinding[] {
  const results: VersionFinding[] = [];
  const regex = /^github\.com\/sigstore\/sigstore\s+(v[\w.\-+]+)\s+/gm;
  let match = regex.exec(content);
  while (match) {
    const version = match[1];
    results.push({
      package: 'github.com/sigstore/sigstore',
      file,
      version,
      source: 'go.sum',
      status: evaluateVersion(version, MIN_SIGSTORE_GO),
    });
    match = regex.exec(content);
  }
  return results;
}

function parsePoetryLock(content: string, file: string): VersionFinding[] {
  const results: VersionFinding[] = [];
  let currentName: string | null = null;
  let currentVersion: string | null = null;
  const lines = content.split(/\r?\n/);
  const flush = () => {
    if (currentName === 'sigstore' && currentVersion) {
      results.push({
        package: 'sigstore',
        file,
        version: currentVersion,
        source: 'poetry.lock',
        status: evaluateVersion(currentVersion, MIN_SIGSTORE_PY),
      });
    }
  };
  for (const line of lines) {
    if (line.trim() === '[[package]]') {
      flush();
      currentName = null;
      currentVersion = null;
      continue;
    }
    if (line.startsWith('name =')) {
      currentName = line.split('=')[1]?.trim().replace(/"/g, '') ?? null;
    }
    if (line.startsWith('version =')) {
      currentVersion = line.split('=')[1]?.trim().replace(/"/g, '') ?? null;
    }
  }
  flush();
  return results;
}

function parsePipfileLock(content: string, file: string): VersionFinding[] {
  const results: VersionFinding[] = [];
  let data: any;
  try {
    data = JSON.parse(content);
  } catch (error) {
    return results;
  }
  const sections = ['default', 'develop'];
  for (const section of sections) {
    const dependencies = data?.[section] ?? {};
    if (dependencies.sigstore?.version) {
      const version = String(dependencies.sigstore.version).replace(/^=+/, '');
      results.push({
        package: 'sigstore',
        file,
        version,
        source: 'Pipfile.lock',
        status: evaluateVersion(version, MIN_SIGSTORE_PY),
      });
    }
  }
  return results;
}

function parseRequirements(content: string, file: string): VersionFinding[] {
  const results: VersionFinding[] = [];
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('-')) continue;
    const match = line.match(/^sigstore(?:\[[^\]]+\])?\s*([<>=!~]{1,2})\s*([\w.\-+]+)/i);
    if (!match) continue;
    const operator = match[1];
    const version = match[2];
    const isPinned = operator === '==' || operator === '===';
    const status = isPinned
      ? evaluateVersion(version, MIN_SIGSTORE_PY)
      : 'unbounded';
    results.push({
      package: 'sigstore',
      file,
      version,
      source: 'requirements',
      constraint: operator,
      status,
    });
  }
  return results;
}

function sortFindings(findings: VersionFinding[]): VersionFinding[] {
  return [...findings].sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.package !== b.package) return a.package.localeCompare(b.package);
    if (a.version !== b.version) return a.version.localeCompare(b.version);
    return a.source.localeCompare(b.source);
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = args.root ? path.resolve(args.root) : process.cwd();
  const reportPath = args.report
    ? path.resolve(args.report)
    : path.join(root, 'artifacts/supply-chain/sigstore/version_report.json');

  const trackedFiles = listFiles(root);
  const filesScanned = trackedFiles.filter((file) => {
    return (
      file.endsWith('go.mod') ||
      file.endsWith('go.sum') ||
      file.endsWith('go.work.sum') ||
      file.endsWith('poetry.lock') ||
      file.endsWith('Pipfile.lock') ||
      file.endsWith('requirements.txt') ||
      file.endsWith('requirements.in') ||
      /requirements[-_].*\.txt$/.test(file)
    );
  });

  const goFindings: VersionFinding[] = [];
  const pyFindings: VersionFinding[] = [];

  for (const relativePath of filesScanned) {
    const absolutePath = path.join(root, relativePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    if (relativePath.endsWith('go.mod')) {
      goFindings.push(...parseGoMod(content, relativePath));
      continue;
    }
    if (relativePath.endsWith('go.sum') || relativePath.endsWith('go.work.sum')) {
      goFindings.push(...parseGoSum(content, relativePath));
      continue;
    }
    if (relativePath.endsWith('poetry.lock')) {
      pyFindings.push(...parsePoetryLock(content, relativePath));
      continue;
    }
    if (relativePath.endsWith('Pipfile.lock')) {
      pyFindings.push(...parsePipfileLock(content, relativePath));
      continue;
    }
    if (
      relativePath.endsWith('requirements.txt') ||
      relativePath.endsWith('requirements.in') ||
      /requirements[-_].*\.txt$/.test(relativePath)
    ) {
      pyFindings.push(...parseRequirements(content, relativePath));
    }
  }

  const sortedGoFindings = sortFindings(goFindings);
  const sortedPyFindings = sortFindings(pyFindings);
  const violations = sortFindings([
    ...sortedGoFindings,
    ...sortedPyFindings,
  ]).filter((finding) => finding.status === 'violation');

  const report: Report = {
    min_versions: {
      sigstore_go: MIN_SIGSTORE_GO,
      sigstore_python: MIN_SIGSTORE_PY,
    },
    files_scanned: [...filesScanned].sort(),
    findings: {
      sigstore_go: sortedGoFindings,
      sigstore_python: sortedPyFindings,
    },
    violations,
    status: violations.length > 0 ? 'fail' : 'pass',
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  if (violations.length > 0) {
    console.error('Sigstore version guard failed. Vulnerable versions detected.');
    process.exit(1);
  }

  console.log('Sigstore version guard passed.');
}

main();
