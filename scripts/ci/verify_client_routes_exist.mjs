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
    console.error('\n❌ Error: Found missing route component imports!');
    console.error('The following imports could not be resolved:');
    missingImports.forEach(p => console.error(`  - ${p}`));
    console.error('\nPlease ensure these files exist and are correctly referenced in the router.');
    process.exit(1);
  } else {
    console.log('\n✅ Success: All route component imports are valid.');
  }
}

main();
