import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN_PHRASES = [
  'how to compromise vendor',
  'exploit vendor',
  'attack vendor',
  // Add other offensive or exploitation-focused phrases
];

// Check for required refusal logic (simplified check for now)
const REQUIRED_PATTERNS = [
  // 'refusal', // Maybe check if 'refusal' keyword exists in test files
];

const TARGET_DIRS = [
  'src/agents/scel',
];

function walkDir(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

let hasErrors = false;

TARGET_DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping.`);
    return;
  }

  console.log(`Scanning ${dir}...`);
  walkDir(dir, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.json')) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    FORBIDDEN_PHRASES.forEach(phrase => {
      if (content.toLowerCase().includes(phrase)) {
        console.error(`ERROR: Found forbidden phrase '${phrase}' in ${filePath}`);
        hasErrors = true;
      }
    });
  });
});

if (hasErrors) {
  process.exit(1);
} else {
  console.log('Agent guardrails verification passed.');
}
