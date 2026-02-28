import * as fs from 'fs';
import * as path from 'path';

/**
 * Forbidden patterns to scan for in logs, code, or test fixtures.
 * This list is explicitly defensive and non-offensive.
 */
const forbiddenPatterns = [
  { name: "Raw PII (Phone)", regex: /\b\d{3}-\d{3}-\d{4}\b/g },
  { name: "Raw PII (Email)", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
  { name: "Generic Secret Key", regex: /secret_?[kK]ey\s*[:=]\s*["'][a-f0-9]{32,}["']/gi },
  { name: "Generic Auth Token", regex: /auth_?[tT]oken\s*[:=]\s*["'][a-f0-9]{32,}["']/gi }
];

const ignoredDirs = ["node_modules", ".git", "dist", "build"];

function scanFile(filepath: string): boolean {
  if (ignoredDirs.some(dir => filepath.includes(path.sep + dir + path.sep))) return true;

  const content = fs.readFileSync(filepath, 'utf8');
  let clean = true;

  for (const pattern of forbiddenPatterns) {
    // Reset regex state or use local copy for reliable testing in loop
    const localRegex = new RegExp(pattern.regex.source, pattern.regex.flags.replace('g', ''));
    if (localRegex.test(content)) {
      console.error(`❌ Forbidden pattern found in ${filepath}: ${pattern.name}`);
      clean = false;
    }
  }

  return clean;
}

function scanDir(dir: string): boolean {
  const files = fs.readdirSync(dir);
  let allClean = true;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!scanDir(fullPath)) allClean = false;
    } else {
      if (!scanFile(fullPath)) allClean = false;
    }
  }

  return allClean;
}

// Simple CLI: tsx never-log-scan.ts <dir>
const [,, dirToScan] = process.argv;
if (dirToScan) {
  if (!scanDir(dirToScan)) {
    process.exit(1);
  }
} else {
  console.log("Usage: tsx never-log-scan.ts <directory>");
  process.exit(0);
}
