import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface CacheViolation {
  file: string;
  ruleId: string; // RBP-002 or RBP-003
  message: string;
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

export function validateCache(projectRoot: string): CacheViolation[] {
  const violations: CacheViolation[] = [];

  // Find all TS/TSX files
  const files = findFiles(projectRoot, '.tsx');

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Simple regex to find route components (e.g., export default function Page)
      if (content.match(/export\s+default\s+(?:async\s+)?function\s+(?:Page|Layout|Route)/)) {

        // RBP-002: Missing cache directive in route
        if (!content.includes('export const revalidate') && !content.includes('export const dynamic')) {
          violations.push({
            file: file.replace(/\\/g, '/'),
            ruleId: 'RBP-002',
            message: 'Route missing explicit cache directive (revalidate or dynamic)'
          });
        }

        // RBP-003: No streaming boundary in async route
        if (content.match(/export\s+default\s+async\s+function/) && !content.includes('<Suspense')) {
          violations.push({
            file: file.replace(/\\/g, '/'),
            ruleId: 'RBP-003',
            message: 'Async route missing <Suspense> streaming boundary'
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
  console.log(`Validating cache and streaming in ${root}...`);

  const violations = validateCache(root);

  if (violations.length > 0) {
    console.error(`Found ${violations.length} cache/streaming violations:`);
    console.error(JSON.stringify(violations, null, 2));
    process.exit(1); // Fail CI
  } else {
    console.log('No cache/streaming violations found.');
    process.exit(0);
  }
}
