import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface BoundaryViolation {
  file: string;
  importPath: string;
  ruleId: string; // RBP-001
}

function findFiles(dir: string, extension: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('dist')) {
        findFiles(filePath, extension, fileList);
      }
    } else if (filePath.endsWith(extension) && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

export function analyze(projectRoot: string): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];

  // Find all TS/TSX files
  const files = findFiles(projectRoot, '.ts').concat(findFiles(projectRoot, '.tsx'));

  const clientComponents = new Set<string>();

  // First pass: identify client components
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('"use client"') || content.includes("'use client'")) {
        // Simple normalization for the set
        const normalizedPath = file.replace(/\\/g, '/');
        clientComponents.add(normalizedPath);

        // Also add relative path variants for easier matching later
        const basename = path.basename(file, path.extname(file));
        const dirName = path.dirname(file).replace(/\\/g, '/');
        clientComponents.add(`${dirName}/${basename}`);
      }
    } catch (err) {
      console.warn(`Could not read file: ${file}`);
    }
  }

  // Second pass: check imports
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Skip if this is a client component itself
      if (content.includes('"use client"') || content.includes("'use client'")) {
        continue;
      }

      // Simple regex to find imports
      // This is a naive AST parser alternative for the MWS
      const importRegex = /import\s+(?:.*?\s+from\s+)?['"](.*?)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];

        // Skip node_modules and external packages
        if (!importPath.startsWith('.')) continue;

        // Resolve the import path relative to the current file
        const resolvedPath = path.resolve(path.dirname(file), importPath).replace(/\\/g, '/');

        // Check if the resolved path points to a client component
        let isViolating = false;

        for (const clientComponent of clientComponents) {
          if (clientComponent.startsWith(resolvedPath)) {
            isViolating = true;
            break;
          }
        }

        if (isViolating) {
          violations.push({
            file: file.replace(/\\/g, '/'),
            importPath,
            ruleId: 'RBP-001'
          });
        }
      }
    } catch (err) {
      console.warn(`Could not analyze file: ${file}`);
    }
  }

  // Sort alphabetically for deterministic output
  return violations.sort((a, b) => a.file.localeCompare(b.file));
}

// CLI execution
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const root = process.argv[2] || process.cwd();
  console.log(`Analyzing boundaries in ${root}...`);

  const violations = analyze(root);

  if (violations.length > 0) {
    console.error(`Found ${violations.length} boundary violations:`);
    console.error(JSON.stringify(violations, null, 2));
    process.exit(1); // Fail CI
  } else {
    console.log('No boundary violations found.');
    process.exit(0);
  }
}
