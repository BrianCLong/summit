import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import yaml from 'js-yaml';

export interface WorkspaceConfig {
  packages: string[];
  exclude: string[];
}

export interface PackageInfo {
  name: string;
  version: string;
  path: string;
}

const DEFAULT_EXCLUDES = ['node_modules/**', '**/node_modules/**', '**/dist/**', '**/build/**'];

function resolveRootDir(): string {
  return path.resolve(process.cwd());
}

async function fileExists(candidatePath: string): Promise<boolean> {
  try {
    await stat(candidatePath);
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function normalizeExcludePattern(pattern: string): string {
  return pattern.startsWith('!') ? pattern.slice(1) : pattern;
}

function escapeForRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

function globToRegExp(glob: string): RegExp {
  const normalized = normalizeExcludePattern(glob);
  const escaped = escapeForRegex(normalized);
  const regexSource = escaped.replace(/\\\*\\\*/g, '.*').replace(/\\\*/g, '[^/]*');

  return new RegExp(`^${regexSource}$`);
}

function matchesExcludes(relativePath: string, excludes: string[]): boolean {
  const normalized = relativePath.replace(/\\+/g, '/');
  return excludes.some((pattern) => globToRegExp(pattern).test(normalized));
}

async function expandPattern(
  rootDir: string,
  pattern: string,
  excludes: string[],
): Promise<string[]> {
  const segments = pattern.split('/');

  const walk = async (current: string, index: number): Promise<string[]> => {
    if (index >= segments.length) {
      return [current];
    }

    const segment = segments[index];
    if (!segment.includes('*')) {
      return walk(path.join(current, segment), index + 1);
    }

    const directoryToRead = path.join(rootDir, current);
    const entries = await readdir(directoryToRead, { withFileTypes: true }).catch(() => []);
    const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    const results: string[] = [];
    for (const dir of directories) {
      const nextPath = path.join(current, dir);
      if (matchesExcludes(nextPath, excludes)) {
        continue;
      }
      const expanded = await walk(nextPath, index + 1);
      results.push(...expanded);
    }

    return results;
  };

  return walk('', 0);
}

export async function loadWorkspaceConfig(rootDir = resolveRootDir()): Promise<WorkspaceConfig> {
  const workspacePath = path.join(rootDir, 'pnpm-workspace.yaml');
  if (!(await fileExists(workspacePath))) {
    throw new Error(`pnpm-workspace.yaml not found at ${workspacePath}`);
  }

  const raw = await readFile(workspacePath, 'utf8');
  const parsed = yaml.load(raw) as Partial<WorkspaceConfig>;

  return {
    packages: parsed.packages ?? [],
    exclude: [...(parsed.exclude ?? []), ...DEFAULT_EXCLUDES],
  };
}

export async function collectWorkspaceManifestPaths(rootDir = resolveRootDir()): Promise<string[]> {
  const workspaceConfig = await loadWorkspaceConfig(rootDir);
  const excludes = workspaceConfig.exclude;
  const manifestPaths = new Set<string>();

  const addIfExists = async (relativeDir: string) => {
    const manifestPath = path.join(rootDir, relativeDir, 'package.json');
    if (matchesExcludes(relativeDir, excludes)) {
      return;
    }
    if (await fileExists(manifestPath)) {
      manifestPaths.add(relativeDir || '.');
    }
  };

  await addIfExists('');

  for (const pattern of workspaceConfig.packages) {
    const expanded = await expandPattern(rootDir, pattern, excludes);
    for (const relativeDir of expanded) {
      await addIfExists(relativeDir);
    }
  }

  return Array.from(manifestPaths).sort((left, right) => left.localeCompare(right));
}

export async function readPackageInfo(manifestPath: string): Promise<PackageInfo> {
  const manifestContent = await readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(manifestContent) as Partial<PackageInfo> & { name?: string; version?: string };

  if (!parsed.name || !parsed.version) {
    throw new Error(`package.json at ${manifestPath} is missing a name or version`);
  }

  return {
    name: parsed.name,
    version: parsed.version,
    path: path.dirname(manifestPath),
  };
}

export async function collectPackages(rootDir = resolveRootDir()): Promise<PackageInfo[]> {
  const manifestDirs = await collectWorkspaceManifestPaths(rootDir);
  const packages: PackageInfo[] = [];

  for (const relativeDir of manifestDirs) {
    const manifestPath = path.join(rootDir, relativeDir === '.' ? 'package.json' : `${relativeDir}/package.json`);
    packages.push(await readPackageInfo(manifestPath));
  }

  return packages;
}

export function assertVersionsAligned(packages: PackageInfo[], expectedVersion?: string): void {
  if (packages.length === 0) {
    throw new Error('No packages discovered in workspace');
  }

  const targetVersion = expectedVersion ?? packages[0].version;
  const mismatches = packages.filter((pkg) => pkg.version !== targetVersion);

  if (mismatches.length > 0) {
    const details = mismatches
      .map((pkg) => `- ${pkg.path} (${pkg.name}) is at ${pkg.version}`)
      .join('\n');
    throw new Error(`Version mismatch detected. Expected ${targetVersion} but found:\n${details}`);
  }
}

async function main(): Promise<void> {
  const rootDir = resolveRootDir();
  const packages = await collectPackages(rootDir);
  const rootPackage = packages.find((pkg) => path.resolve(pkg.path) === rootDir) ?? packages.find((pkg) => pkg.path === '.');
  const expectedVersion = rootPackage?.version ?? packages[0].version;

  assertVersionsAligned(packages, expectedVersion);
  console.log(`All ${packages.length} package versions are aligned to ${expectedVersion}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  });
}
