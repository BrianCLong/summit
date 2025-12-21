import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keywords that indicate sensitive data or PII
const KEYWORDS = [
  'email', 'password', 'ssn', 'socialsecurity', 'phone', 'mobile', 'address',
  'dob', 'birth', 'gender', 'ip', 'ipv4', 'ipv6', 'mac', 'deviceid',
  'uuid', 'creditcard', 'cc', 'pan', 'cvv', 'iban', 'bank', 'account',
  'passport', 'license', 'biometric', 'face', 'fingerprint', 'voice',
  'token', 'secret', 'auth', 'credential', 'location', 'gps', 'latitude', 'longitude'
];

// Directories to scan
const SEARCH_DIRS = [
  '../../server/src',
  '../../apps/web/src',
  '../../server/src/db/migrations'
];

const IGNORE_DIRS = [
  'node_modules',
  'dist',
  'build',
  '__tests__',
  '__mocks__'
];

interface Match {
  file: string;
  line: number;
  content: string;
  keyword: string;
}

function scanFile(filePath: string): Match[] {
  const matches: Match[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      KEYWORDS.forEach(keyword => {
        // Simple word boundary check
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(line)) {
            const truncatedLine = line.trim().substring(0, 100);
            matches.push({
              file: filePath,
              line: index + 1,
              content: truncatedLine,
              keyword: keyword
            });
        }
      });
    });
  } catch (err) {
    // ignore read errors
  }
  return matches;
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        walkDir(filePath, fileList);
      }
    } else {
      if (['.ts', '.js', '.sql', '.prisma', '.graphql'].includes(path.extname(file))) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

function main() {
  console.log('# Data Inventory Scan Report');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');

  const allMatches: Match[] = [];

  SEARCH_DIRS.forEach(searchDir => {
    const resolvedDir = path.resolve(__dirname, searchDir);
    const files = walkDir(resolvedDir);
    files.forEach(file => {
      const matches = scanFile(file);
      allMatches.push(...matches);
    });
  });

  // Group by Keyword
  const grouped: Record<string, Match[]> = {};
  KEYWORDS.forEach(k => grouped[k] = []);
  allMatches.forEach(m => {
      if (grouped[m.keyword]) grouped[m.keyword].push(m);
  });

  console.log('## Summary');
  console.log('| Keyword | Count |');
  console.log('| :--- | :--- |');
  Object.keys(grouped).forEach(k => {
      if (grouped[k].length > 0) {
          console.log(`| ${k} | ${grouped[k].length} |`);
      }
  });
  console.log('');

  console.log('## Detailed Matches (Top 5 per keyword)');
  Object.keys(grouped).forEach(k => {
      if (grouped[k].length > 0) {
          console.log(`\n### ${k}`);
          grouped[k].slice(0, 5).forEach(m => {
             const relPath = path.relative(path.resolve(__dirname, '../..'), m.file);
             console.log(`- **${relPath}:${m.line}**: \`${m.content}\``);
          });
      }
  });
}

main();
