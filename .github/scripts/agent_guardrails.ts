import fs from 'fs';
import path from 'path';

const ATG_AGENTS_PATH = 'src/agents/atg';
const DISALLOWED_KEYWORDS = [
  'exploit', 'payload', 'phishing', 'malware', 'bypass', 'credential stuffing',
  'brute force'
];

function walk(dir: string, callback: (filepath: string) => void) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else {
      callback(filepath);
    }
  });
}

function checkFile(filepath: string) {
  const content = fs.readFileSync(filepath, 'utf8').toLowerCase();
  for (const word of DISALLOWED_KEYWORDS) {
    if (content.includes(word)) {
      console.error(`Forbidden keyword "${word}" found in ${filepath}`);
      process.exit(1);
    }
  }
}

function main() {
  if (!fs.existsSync(ATG_AGENTS_PATH)) {
    console.log(`ATG agents path ${ATG_AGENTS_PATH} not found. Skipping.`);
    return;
  }
  walk(ATG_AGENTS_PATH, checkFile);
  console.log('✅ Agent guardrails check complete.');
}
main();
