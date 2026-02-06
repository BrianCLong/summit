import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN_TERMS = [
  'raw_keystroke',
  'video_stream',
  'audio_capture',
  'biometric_raw',
  'keypress_log'
];

const SCAN_DIR = 'src/graphrag/itt';

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
      for (const term of FORBIDDEN_TERMS) {
        if (content.includes(term)) {
          console.error(`ERROR: Forbidden term "${term}" found in ${fullPath}`);
          process.exit(1);
        }
      }
    }
  }
}

console.log("Starting Privacy Scan...");
scanDirectory(SCAN_DIR);
console.log("Privacy Scan Complete. No violations found.");
