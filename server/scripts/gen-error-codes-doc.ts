
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { MasterErrorCatalog } from '../src/errors/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '../../docs/support/ERROR_CODES.md');

function generateMarkdown(): string {
  let md = '# Error Codes Reference\n\n';
  md += 'This document is auto-generated from `server/src/errors/catalog.ts`. Do not edit manually.\n\n';
  md += '| Code | Status | Message | Remediation | Category |\n';
  md += '|------|--------|---------|-------------|----------|\n';

  const errors = Object.values(MasterErrorCatalog).sort((a, b) => a.code.localeCompare(b.code));

  for (const error of errors) {
    md += `| ${error.code} | ${error.status} | ${error.message} | ${error.remediation} | ${error.category} |\n`;
  }

  return md;
}

function main() {
  const md = generateMarkdown();
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, md);
  console.log(`Generated ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
