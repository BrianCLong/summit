
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../'); // server/

const jestGlobals = [
  'jest',
  'describe',
  'it',
  'test',
  'expect',
  'beforeAll',
  'afterAll',
  'beforeEach',
  'afterEach',
];

async function fixImports() {
  const files: string[] = [];

  function walk(dir: string) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          if (file !== 'node_modules' && file !== 'dist' && file !== 'coverage') {
            walk(filePath);
          }
        } else {
          if (file.endsWith('.test.ts')) {
            files.push(filePath);
          }
        }
      } catch (e) {
        // ignore
      }
    });
  }

  walk(projectRoot);

  console.log(`Found ${files.length} test files.`);

  let fixedCount = 0;
  const limit = 40;

  for (const file of files) {
    if (fixedCount >= limit) break;

    let content = fs.readFileSync(file, 'utf-8');

    const usedGlobals = jestGlobals.filter(g => {
      const regex = new RegExp(`\\b${g}\\b`);
      return regex.test(content);
    });

    if (usedGlobals.length === 0) continue;

    if (content.includes("from '@jest/globals'")) {
        continue;
    }

    const importStatement = `import { ${usedGlobals.join(', ')} } from '@jest/globals';`;

    const lines = content.split('\n');
    let lastImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
            lastImportLine = i;
        }
    }

    if (lastImportLine !== -1) {
        lines.splice(lastImportLine + 1, 0, importStatement);
    } else {
        lines.unshift(importStatement);
    }

    content = lines.join('\n');

    fs.writeFileSync(file, content, 'utf-8');
    fixedCount++;
    console.log(`Fixed ${path.relative(projectRoot, file)}`);
  }

  console.log(`Fixed ${fixedCount} files.`);
}

fixImports().catch(console.error);
