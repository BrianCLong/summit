#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const routerFilePath = path.join(projectRoot, 'client', 'src', 'App.router.jsx');
const srcDir = path.dirname(routerFilePath);

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

function findImportPaths(content) {
  const importRegex = /(?:import|from)\s+['"](.*?)['"]|React\.lazy\(\(\)\s*=>\s*import\(['"](.*?)['"]\)\)/g;
  const paths = new Set();
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (importPath && importPath.startsWith('.')) {
      paths.add(importPath);
    }
  }
  return Array.from(paths);
}

function checkFileExists(importPath) {
  const absolutePath = path.resolve(srcDir, importPath);
  // Check with extensions
  for (const ext of extensions) {
    if (fs.existsSync(absolutePath + ext)) {
      return true;
    }
  }
  // Check if it's a directory with an index file
  for (const ext of extensions) {
    if (fs.existsSync(path.join(absolutePath, 'index' + ext))) {
      return true;
    }
  }
  // Check if the path as-is exists (e.g. with extension)
  if (fs.existsSync(absolutePath)) {
    return true;
  }

  return false;
}

function main() {
  console.log(`🔍 Auditing router file: ${routerFilePath}`);
  const routerContent = fs.readFileSync(routerFilePath, 'utf-8');
  const importPaths = findImportPaths(routerContent);
  const missingImports = [];

  console.log(`🔎 Found ${importPaths.length} unique relative imports to check...`);

  for (const importPath of importPaths.sort()) {
    if (!checkFileExists(importPath)) {
      missingImports.push(importPath);
    }
  }

  if (missingImports.length > 0) {
    console.error('\n\x1b[31m❌ Error: Found missing route component imports!\x1b[0m');
    console.error('\x1b[33mThe following imports could be found in App.router.jsx but do not exist on disk:\x1b[0m');
    missingImports.forEach(p => console.error(`  - \x1b[1m${p}\x1b[0m`));

    console.error('\n\x1b[36m💡 How to fix:\x1b[0m');
    console.error('1. \x1b[1mCreate the missing component:\x1b[0m If the route is new or should exist, create the file at the expected path.');
    console.error('2. \x1b[1mCreate a stub page:\x1b[0m If the implementation is pending, create a minimal stub page following the contract in:');
    console.error('   \x1b[34mdocs/ops/client/stub-pages-contract.md\x1b[0m');
    console.error('3. \x1b[1mUpdate the router:\x1b[0m If the import path is incorrect, fix it in \x1b[32mclient/src/App.router.jsx\x1b[0m.');
    console.error('\nFor more details on the router audit, see: \x1b[34mdocs/ops/client/router-audit.md\x1b[0m');
    
    process.exit(1);
  } else {
    console.log('\n\x1b[32m✅ Success: All route component imports are valid.\x1b[0m');
  }
}

main();
