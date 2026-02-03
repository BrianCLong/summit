import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const options = {
  job: { type: 'string' },
  runner: { type: 'string' },
  'lock-hash': { type: 'string' },
  out: { type: 'string' },
};

const { values } = parseArgs({ options, allowPositionals: true });

const output = {
  job: values.job,
  runner: values.runner,
  lockHash: values['lock-hash'],
  timestamp: new Date().toISOString(),
};

const outFile = values.out || 'evidence.json';
const outDir = path.dirname(outFile);

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
console.log(`Evidence written to ${outFile}`);
