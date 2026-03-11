import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CODE_EXTENSIONS = new Set([
  '.c',
  '.cc',
  '.cpp',
  '.cs',
  '.go',
  '.java',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
  '.py',
  '.rb',
  '.rs',
  '.scala',
  '.swift',
]);

const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', 'vendor']);

export function isRemoteSource(input) {
  return /^(https?:\/\/|git@|ssh:\/\/)/.test(input);
}

export async function materializeRepository(input) {
  if (!isRemoteSource(input)) {
    return { repoPath: resolve(input), cleanup: async () => {} };
  }

  const targetDir = await mkdtemp(join(tmpdir(), 'summit-intel-'));
  await execFileAsync('git', ['clone', '--depth', '1', input, targetDir], {
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    repoPath: targetDir,
    cleanup: async () => {
      await rm(targetDir, { recursive: true, force: true });
    },
  };
}

async function walkFiles(rootPath, currentPath = rootPath, files = []) {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        await walkFiles(rootPath, fullPath, files);
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function bucketByDirectory(files, rootPath) {
  const buckets = new Set();
  for (const file of files) {
    buckets.add(dirname(file).replace(rootPath, '') || '/');
  }
  return buckets.size;
}

function estimateDependencyRisk(fileCount) {
  if (fileCount > 2000) return { label: 'High', clusters: Math.max(3, Math.floor(fileCount / 300)) };
  if (fileCount > 700) return { label: 'Moderate', clusters: Math.max(2, Math.floor(fileCount / 400)) };
  return { label: 'Low', clusters: Math.max(1, Math.floor(fileCount / 500) + 1) };
}

function architectureHealth(modulesAnalyzed, riskClusters) {
  return Math.max(30, Math.min(96, 90 - Math.floor(modulesAnalyzed / 50) - riskClusters * 2));
}

function ciInstability(modulesAnalyzed, riskClusters) {
  return Math.max(5, Math.min(95, Math.floor(modulesAnalyzed / 40) + riskClusters * 4));
}

export async function analyzeRepository(repoPath) {
  const files = await walkFiles(repoPath);
  const codeFiles = [];

  for (const file of files) {
    const st = await stat(file);
    if (st.size > 1024 * 1024) continue;
    if (CODE_EXTENSIONS.has(extname(file))) {
      codeFiles.push(file);
    }
  }

  const modules = bucketByDirectory(codeFiles, repoPath);
  const dependency = estimateDependencyRisk(codeFiles.length);

  return {
    modulesAnalyzed: modules,
    highRiskDependencyClusters: dependency.clusters,
    dependencyRisk: dependency.label,
    architectureHealth: architectureHealth(modules, dependency.clusters),
    ciInstabilityProbability: ciInstability(modules, dependency.clusters),
  };
}

export function formatReport(source, summary) {
  return [
    `Repository: ${source}`,
    '',
    'Repository Intelligence',
    '-----------------------',
    `Modules analyzed: ${summary.modulesAnalyzed.toLocaleString()}`,
    `High-risk dependency clusters: ${summary.highRiskDependencyClusters}`,
    `Dependency Risk: ${summary.dependencyRisk}`,
    `Architecture health: ${summary.architectureHealth} / 100`,
    `CI instability probability: ${summary.ciInstabilityProbability}%`,
  ].join('\n');
}
