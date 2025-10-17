import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const skillsDir = path.resolve('.claude/skills');
const skills = fs.readdirSync(skillsDir).filter(d => fs.existsSync(path.join(skillsDir, d, 'scripts', 'verify.ts')));

let failed = 0;
for (const s of skills) {
  const verifyPath = path.join(skillsDir, s, 'scripts', 'verify.ts');
  console.log(`\n--- Running verify for ${s} ---`);
  try {
    // Prefer ts-node if available; fallback to ts-node/register/transpile-only or just node if JS
    if (verifyPath.endsWith('.ts')) {
      try {
        execSync(`npx -y ts-node ${verifyPath}`, { stdio: 'inherit' });
      } catch (e) {
        console.warn('ts-node not available, attempting tsx...');
        execSync(`npx -y tsx ${verifyPath}`, { stdio: 'inherit' });
      }
    } else {
      execSync(`node ${verifyPath}`, { stdio: 'inherit' });
    }
  } catch (e) {
    console.error(`Verify failed for ${s}`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} skill(s) failed verification.`);
  process.exit(1);
} else {
  console.log('\nAll skills verified successfully.');
}
