import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN_PATTERNS = [
  /password:\s*\S+/i,
  /secret:\s*\S+/i,
  /api[-_]?key:\s*\S+/i,
  /auth[-_]?token:\s*\S+/i,
  /ssn:\s*\d{3}-\d{2}-\d{4}/i,
  /phone[-_]?number:\s*\d+/i,
  /credit[-_]?card:\s*\d+/i
];

const SEARCH_DIRS = ['evidence'];

async function main() {
  let foundViolations = false;
  for (const dir of SEARCH_DIRS) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = fs.readdirSync(dirPath, { recursive: true }) as string[];
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) continue;
      if (!file.endsWith('.json') && !file.endsWith('.log')) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          if (filePath.includes('.schema.json')) continue;
          console.error(`FORBIDDEN FIELD DETECTED in ${filePath}: matched ${pattern}`);
          foundViolations = true;
        }
      }
    }
  }
  if (foundViolations) {
    console.error('NEVER-LOG SCAN FAILED: Sensitive patterns found in evidence or logs.');
    process.exit(1);
  }
  console.log('NEVER-LOG scan passed.');
}
main().catch(err => { console.error(err); process.exit(1); });
