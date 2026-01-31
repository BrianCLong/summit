import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', 'src');

const extensionsToFix = ['.ts', '.tsx'];
const targetExtension = '.js';

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walk(filepath, callback);
    } else if (stats.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      callback(filepath);
    }
  }
}

function fixImports(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  // Regex for import/export ... from '...'
  // Matches relative paths starting with . or ..
  // Captures the path in group 1
  const regex = /(import|export)\s+[\s\S]*?\s+from\s+['"](\.\.?\/[^'"]*)['"]/g;

  content = content.replace(regex, (match, type, importPath) => {
    // If it already has an extension that we want to keep (like .json, .css, .js)
    if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.css') || importPath.endsWith('.scss')) {
      return match;
    }

    // Remove existing .ts or .tsx if present
    let newPath = importPath;
    if (newPath.endsWith('.ts')) {
      newPath = newPath.slice(0, -3);
    } else if (newPath.endsWith('.tsx')) {
      newPath = newPath.slice(0, -4);
    }

    // Add .js
    newPath += '.js';
    changed = true;
    return match.replace(importPath, newPath);
  });

  // Regex for dynamic import(...)
  const dynamicRegex = /import\(['"](\.\.?\/[^'"]*)['"]\)/g;
  content = content.replace(dynamicRegex, (match, importPath) => {
    if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.css') || importPath.endsWith('.scss')) {
      return match;
    }
    let newPath = importPath;
    if (newPath.endsWith('.ts')) {
      newPath = newPath.slice(0, -3);
    } else if (newPath.endsWith('.tsx')) {
      newPath = newPath.slice(0, -4);
    }
    newPath += '.js';
    changed = true;
    return match.replace(importPath, newPath);
  });

  if (changed) {
    fs.writeFileSync(filepath, content, 'utf8');
    // console.log(`Fixed imports in ${path.relative(rootDir, filepath)}`);
  }
}

console.log('Fixing ESM imports in server/src...');
walk(rootDir, fixImports);

// Also walk other top level folders
const otherFolders = ['health', 'lib', 'config', 'utils', 'metrics', 'db', 'routes', 'services', 'models', 'graphql'];
for (const folder of otherFolders) {
  const folderPath = path.resolve(__dirname, '..', folder);
  if (fs.existsSync(folderPath)) {
    console.log(`Fixing ESM imports in server/${folder}...`);
    walk(folderPath, fixImports);
  }
}

// Also fix root packages
const rootPackagesDir = path.resolve(__dirname, '..', '..', 'packages');
if (fs.existsSync(rootPackagesDir)) {
  console.log('Fixing ESM imports in root packages...');
  walk(rootPackagesDir, fixImports);
}

console.log('Import fix completed.');
