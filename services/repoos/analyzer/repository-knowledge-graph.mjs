import fs from 'fs';
import path from 'path';

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const DEFAULT_IGNORES = ['.git', 'node_modules', 'dist', 'build', '.next', '.turbo'];

/**
 * @typedef {'module' | 'file' | 'directory' | 'developer' | 'pull_request'} GraphNodeType
 * @typedef {'imports' | 'modifies' | 'contains' | 'authored_by'} GraphEdgeType
 *
 * @typedef {{id: string, type: GraphNodeType, metadata?: Record<string, string | number | boolean>}} GraphNode
 * @typedef {{from: string, to: string, type: GraphEdgeType}} GraphEdge
 * @typedef {{id: string, author: string, files: string[]}} PullRequestRecord
 * @typedef {{extensions?: readonly string[], ignoreDirectories?: readonly string[], pullRequests?: readonly PullRequestRecord[]}} BuildGraphOptions
 * @typedef {{generatedAt: string, root: string, nodes: GraphNode[], edges: GraphEdge[]}} RepositoryKnowledgeGraph
 */

/**
 * Build a repository knowledge graph from source files plus optional PR metadata.
 *
 * @param {string} repoPath
 * @param {BuildGraphOptions} [options]
 * @returns {RepositoryKnowledgeGraph}
 */
export function buildRepositoryKnowledgeGraph(repoPath, options = {}) {
  const root = path.resolve(repoPath);
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const ignoreDirectories = new Set(options.ignoreDirectories ?? DEFAULT_IGNORES);

  /** @type {Map<string, GraphNode>} */
  const nodes = new Map();
  const edges = new Set();

  /** @param {GraphNode} node */
  const addNode = (node) => {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
    }
  };

  /** @param {GraphEdge} edge */
  const addEdge = (edge) => {
    edges.add(JSON.stringify(edge));
  };

  addNode({ id: '.', type: 'directory' });

  const files = [];

  /** @param {string} absoluteDir */
  const walk = (absoluteDir) => {
    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.github') {
        continue;
      }

      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = normalizePath(path.relative(root, absolutePath));

      if (entry.isDirectory()) {
        if (ignoreDirectories.has(entry.name)) {
          continue;
        }

        addNode({ id: relativePath, type: 'directory' });

        const parent = normalizePath(path.dirname(relativePath));
        addEdge({ from: parent === '' ? '.' : parent, to: relativePath, type: 'contains' });
        walk(absolutePath);
      } else if (entry.isFile()) {
        const extension = path.extname(entry.name);
        if (!extensions.includes(extension)) {
          continue;
        }

        addNode({ id: relativePath, type: 'file' });
        addNode({ id: relativePath, type: 'module' });

        const parent = normalizePath(path.dirname(relativePath));
        addEdge({ from: parent === '' ? '.' : parent, to: relativePath, type: 'contains' });

        files.push(relativePath);
      }
    }
  };

  walk(root);

  for (const filePath of files) {
    const absolutePath = path.join(root, filePath);
    const source = fs.readFileSync(absolutePath, 'utf8');
    const imports = extractImports(source);

    for (const specifier of imports) {
      const resolvedModule = resolveImportPath(filePath, specifier, root, extensions);
      if (!resolvedModule) {
        continue;
      }

      addNode({ id: resolvedModule, type: 'module' });
      addEdge({ from: filePath, to: resolvedModule, type: 'imports' });
    }
  }

  for (const record of options.pullRequests ?? []) {
    const prId = `pr:${record.id}`;
    const developerId = `dev:${record.author}`;

    addNode({ id: prId, type: 'pull_request' });
    addNode({ id: developerId, type: 'developer' });
    addEdge({ from: prId, to: developerId, type: 'authored_by' });

    for (const modifiedFile of record.files) {
      const normalized = normalizePath(modifiedFile);
      addNode({ id: normalized, type: 'file' });
      addNode({ id: normalized, type: 'module' });
      addEdge({ from: prId, to: normalized, type: 'modifies' });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    root,
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges].map((edge) => JSON.parse(edge)),
  };
}

/**
 * @param {RepositoryKnowledgeGraph} graph
 * @param {string} repoPath
 * @param {string} [outputPath]
 * @returns {string}
 */
export function persistRepositoryKnowledgeGraph(
  graph,
  repoPath,
  outputPath = '.repoos/graph/repository-graph.json'
) {
  const absoluteOutput = path.resolve(repoPath, outputPath);
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
  return absoluteOutput;
}

/** @param {string} source */
function extractImports(source) {
  const specifiers = new Set();
  const importRegex = /import\s+(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const regex of [importRegex, dynamicImportRegex, requireRegex]) {
    let match;
    while ((match = regex.exec(source)) !== null) {
      specifiers.add(match[1]);
    }
  }

  return [...specifiers];
}

function resolveImportPath(fromFile, specifier, repoPath, extensions) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    return null;
  }

  const fromDirectory = path.dirname(path.resolve(repoPath, fromFile));
  const absoluteCandidate = specifier.startsWith('/')
    ? path.resolve(repoPath, `.${specifier}`)
    : path.resolve(fromDirectory, specifier);

  const candidates = [
    absoluteCandidate,
    ...extensions.map((extension) => `${absoluteCandidate}${extension}`),
    ...extensions.map((extension) => path.join(absoluteCandidate, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return normalizePath(path.relative(repoPath, candidate));
    }
  }

  return null;
}

function normalizePath(inputPath) {
  return inputPath.replaceAll(path.sep, '/');
}
