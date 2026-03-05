import fs from 'fs';
const content = fs.readFileSync('client/package.json', 'utf8');
const p = /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g;
let match;
while ((match = p.exec(content)) !== null) {
  console.log(`Found: ${match[0]} at index ${match.index}`);
}
