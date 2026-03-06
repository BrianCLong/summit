import fs from 'fs';
const files = ['GOVERNANCE.md', 'CODEOWNERS', 'SECURITY.md'];
let missing = 0;
files.forEach(f => {
  if (!fs.existsSync(f)) {
    console.error(`Missing mandatory governance document: ${f}`);
    missing++;
  } else {
    console.log(`Verified: ${f}`);
  }
});
if (missing > 0) process.exit(1);
console.log('All mandatory governance documents present.');
