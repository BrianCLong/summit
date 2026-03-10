#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DEFAULT_OUTPUT = '.repoos/graph/repository-graph.json';
const MAX_DEPENDENCIES_PER_MODULE = 250;

const EXCLUDED_DIRS = new Set([
  '.git',
  '.next',
  '.turbo',
  '.repoos',
  'coverage',
  'dist',
  'build',
  'node_modules',
]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    root: process.cwd(),
    output: DEFAULT_OUTPUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--root' && argv[index + 1]) {
      options.root = path.resolve(argv[index + 1]);
      index += 1;
    } else if (token.startsWith('--root=')) {
      options.root = path.resolve(token.split('=')[1]);
    } else if (token === '--output' && argv[index + 1]) {
      options.output = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--output=')) {
      options.output = token.split('=')[1];
    }
  }

  return options;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function walkForPackageJson(rootDir) {
  const queue = [rootDir];
  const results = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) {
          continue;
        }
        queue.push(entryPath);
      } else if (entry.isFile() && entry.name === 'package.json') {
        results.push(entryPath);
      }
    }
  }

  return results;
}

function collectContributors(rootDir) {
  try {
    const output = execSync('git shortlog -sne HEAD', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });

    return output
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (!match) {
          return null;
        }
        return {
          id: `contributor:${match[2]}`,
          type: 'contributor',
          name: match[2],
          commits: Number(match[1]),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildGraph(rootDir) {
  const packageFiles = walkForPackageJson(rootDir);
  const nodes = [];
  const relationships = [];
  const seenDirectory = new Set();
  const seenDependency = new Set();
  const seenModule = new Set();

  for (const packageFile of packageFiles) {
    const packageJson = readJsonSafe(packageFile);
    if (!packageJson?.name) {
      continue;
    }

    const moduleId = `module:${packageJson.name}`;
    const packageDir = path.dirname(packageFile);
    const relativeDirectory = toPosix(path.relative(rootDir, packageDir)) || '.';
    const directoryId = `directory:${relativeDirectory}`;

    if (!seenModule.has(moduleId)) {
      nodes.push({
        id: moduleId,
        type: 'module',
        name: packageJson.name,
        version: packageJson.version ?? '0.0.0',
        private: Boolean(packageJson.private),
        directory: relativeDirectory,
      });
      seenModule.add(moduleId);
    }

    if (!seenDirectory.has(directoryId)) {
      nodes.push({
        id: directoryId,
        type: 'directory',
        path: relativeDirectory,
      });
      seenDirectory.add(directoryId);
    }

    relationships.push({ from: directoryId, to: moduleId, type: 'contains' });

    const dependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
      ...(packageJson.peerDependencies ?? {}),
    };

    const dependencyNames = Object.keys(dependencies)
      .sort((left, right) => left.localeCompare(right))
      .slice(0, MAX_DEPENDENCIES_PER_MODULE);

    for (const dependencyName of dependencyNames) {
      const dependencyId = `dependency:${dependencyName}`;
      if (!seenDependency.has(dependencyId)) {
        nodes.push({ id: dependencyId, type: 'dependency', name: dependencyName });
        seenDependency.add(dependencyId);
      }

      relationships.push({ from: moduleId, to: dependencyId, type: 'depends_on' });
    }
  }

  const contributors = collectContributors(rootDir);
  nodes.push(...contributors);

  const modules = nodes.filter((node) => node.type === 'module').map((node) => node.id);
  for (const contributor of contributors) {
    for (const moduleId of modules) {
      relationships.push({
        from: contributor.id,
        to: moduleId,
        type: 'modifies',
        heuristic: 'repo-level-attribution',
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    root: rootDir,
    nodeCount: nodes.length,
    relationshipCount: relationships.length,
    nodes,
    relationships,
  };
}

function writeGraph(graph, outputPath, cwd = process.cwd()) {
  const absoluteOutput = path.resolve(cwd, outputPath);
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, `${JSON.stringify(graph, null, 2)}\n`);
  return absoluteOutput;
}

function main() {
  const options = parseArgs();
  const graph = buildGraph(options.root);
  const outputPath = writeGraph(graph, options.output);

  console.log('[REPOOS] Repository graph generated');
  console.log(`- modules: ${graph.nodes.filter((node) => node.type === 'module').length}`);
  console.log(`- dependencies: ${graph.nodes.filter((node) => node.type === 'dependency').length}`);
  console.log(`- directories: ${graph.nodes.filter((node) => node.type === 'directory').length}`);
  console.log(`- contributors: ${graph.nodes.filter((node) => node.type === 'contributor').length}`);
  console.log(`- output: ${outputPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildGraph, writeGraph, parseArgs, walkForPackageJson, collectContributors };
