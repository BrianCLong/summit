import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const BLACKLIST = [
  /api[_-]key/i,
  /secret/i,
  /password/i,
  /token/i,
  /auth/i,
  /cookie/i,
];

function checkNeverLog(dir: string) {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
        checkNeverLog(fullPath);
        continue;
    }
    const content = readFileSync(fullPath, 'utf-8');
    for (const pattern of BLACKLIST) {
      if (pattern.test(content)) {
        if (content.includes('":') || content.includes('=') || content.includes(': ')) {
           console.error(`::error::File ${fullPath} matches blacklisted pattern ${pattern} - CI BLOCKED`);
           process.exit(1);
        }
      }
    }
  }
}

['artifacts', 'logs'].forEach(dir => {
    checkNeverLog(dir);
});
console.log("✅ Never-log scan passed");
