import * as fs from 'fs';
import * as path from 'path';

/**
 * Forbidden patterns to scan for in logs, code, or test fixtures.
 * This list is explicitly defensive and non-offensive.
 */
const forbiddenPatterns = [
  { name: "Raw PII (Phone)", regex: /\b\d{3}-\d{3}-\d{4}\b/ },
  { name: "Raw PII (Email)", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ },
  { name: "Generic Secret Key", regex: /secret_?[kK]ey\s*[:=]\s*["'][a-f0-9]{32,}["']/i },
  { name: "Generic Auth Token", regex: /auth_?[tT]oken\s*[:=]\s*["'][a-f0-9]{32,}["']/i }
];

const allowedEmailPatterns = [
  /@datadoghq\.com/,
  /@pagerduty\.com/,
  /@intelgraph\.local/,
  /@intelgraph\.com/,
  /@company\.com/,
  /@github\.com/,
  /support@/,
  /@example\.com/,
  /@example\.org/,
  /@agency\.gov/,
  /@acme\.com/,
  /@acme-corp\.com/,
  /@organization\.com/,
  /@openai\.com/,
  /@topicality\.summit/,
  /@intelgraph\.ai/,
  /@companyos\.io/,
  /@summit\.com/,
  /@summit\.example/,
  /@topicality\.co/,
  /@topicality\.ai/,
  /@intelgraph\.internal/,
  /@summit\.local/,
  /@summit\.ai/,
  /@summit\.app/,
  /@summit\.intel/,
  /@anthropic\.com/,
  /@megaeu\.com/,
  /@acme\.test/,
  /@alpha\.tld/
];

const ignoredDirs = ["node_modules", ".git", "dist", "build", ".venv_312", "coverage"];

function scanFile(filepath: string): boolean {
  if (ignoredDirs.some(dir => filepath.includes(path.sep + dir + path.sep))) return true;
  if (filepath.endsWith('.json') || filepath.endsWith('.ts') || filepath.endsWith('.js') || filepath.endsWith('.md')) {
    // only scan text files
  } else {
    return true;
  }

  const content = fs.readFileSync(filepath, 'utf8');
  let clean = true;

  for (const pattern of forbiddenPatterns) {
    const matches = content.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        if (pattern.name === "Raw PII (Email)" && allowedEmailPatterns.some(p => p.test(match))) {
          continue;
        }
        console.error(`❌ Forbidden pattern found in ${filepath}: ${pattern.name} ("${match}")`);
        clean = false;
      }
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

// Simple CLI: tsx never-log-scan.ts <dirs...>
const dirsToScan = process.argv.slice(2);
if (dirsToScan.length > 0) {
  let allClean = true;
  for (const dir of dirsToScan) {
    console.log(`🔍 Scanning ${dir}...`);
    if (!scanDir(dir)) allClean = false;
  }
  if (!allClean) process.exit(1);
  console.log("✨ Never-log scan complete.");
} else {
  console.log("Usage: npx tsx .github/scripts/never-log-scan.ts <directories...>");
  process.exit(0);
}
