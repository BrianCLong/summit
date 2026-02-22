import * as fs from 'fs';
import * as path from 'path';

const CIS_AGENTS_DIR = 'src/agents/cis';

// Prohibited terms/patterns that suggest deception or operational influence
const PROHIBITED_PATTERNS = [
  /generate deceptive content/i,
  /create fake persona/i,
  /impersonate/i,
  /manipulate narrative/i,
  /covert influence op/i,
  /deepfake/i,
  /bypass safety/i
];

function scanDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping scan.`);
    return;
  }

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check for prohibited patterns
      for (const pattern of PROHIBITED_PATTERNS) {
        if (pattern.test(content)) {
          // Allow if it's in a refusal test or explicitly marked as a guardrail check
          if ((fullPath.includes('.test.') || fullPath.includes('guardrails.ts')) && (content.includes('expect(') || content.includes('Refusal'))) {
            continue;
          }
          console.error(`ERROR: Prohibited pattern '${pattern}' found in ${fullPath}`);
          process.exit(1);
        }
      }
    }
  }
}

console.log(`Scanning ${CIS_AGENTS_DIR} for guardrails...`);
scanDirectory(CIS_AGENTS_DIR);
console.log('Guardrails check passed.');
