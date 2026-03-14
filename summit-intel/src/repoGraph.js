import fs from 'node:fs';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.turbo']);

export function buildRepoGraph(repoPath) {
  const files = walkSourceFiles(repoPath);
  const modules = files.map((file) => ({
    file: path.relative(repoPath, file),
    imports: extractImports(file),
  }));

  return {
    modules,
    generatedAt: new Date().toISOString(),
  };
}

export function walkSourceFiles(rootDir) {
  const output = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const nextPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          walk(nextPath);
        }
        continue;
      }

      if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        output.push(nextPath);
      }
    }
  }

  walk(rootDir);
  return output;
}

export function extractImports(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const imports = new Set();

  const importRegex = /import\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
  const exportRegex = /export\s+[^'";]*?\s+from\s+['"]([^'"]+)['"]/g;
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

  for (const regex of [importRegex, exportRegex, requireRegex]) {
    let match;
    while ((match = regex.exec(code)) !== null) {
      imports.add(match[1]);
    }
  }

  return [...imports].sort();
}
