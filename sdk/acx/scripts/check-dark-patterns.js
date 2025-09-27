import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packPath = path.resolve(__dirname, '../templates/policyPack.json');
const patternsPath = path.resolve(__dirname, '../src/dark-patterns.json');

const pack = JSON.parse(readFileSync(packPath, 'utf-8'));
const patterns = JSON.parse(readFileSync(patternsPath, 'utf-8'));

const findings = [];

const inspect = (locale, value) => {
  if (typeof value === 'string') {
    patterns.forEach((pattern) => {
      if (value.toLowerCase().includes(pattern.toLowerCase())) {
        findings.push({ locale, pattern, text: value });
      }
    });
  } else if (Array.isArray(value)) {
    value.forEach((item) => inspect(locale, item));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => inspect(locale, item));
  }
};

Object.entries(pack.locales).forEach(([locale, copy]) => inspect(locale, copy));

if (findings.length > 0) {
  const details = findings.map((finding) => `${finding.locale}: disallowed pattern "${finding.pattern}" in \"${finding.text}\"`).join('\n');
  console.error(`Dark pattern linter failed:\n${details}`);
  process.exit(1);
}
