import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const BLACKLIST = [
  /\bapi[_-]key\b/i,
  /\bsecret\b/i,
  /\bpassword\b/i,
  /\btoken\b/i,
  /\bauth\b/i,
  /\bcookie\b/i,
  /\bphone_number\b/i,
  /\bssn\b/i,
  /\bemail_address\b/i,
  /\bprivate_handle\b/i,
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
