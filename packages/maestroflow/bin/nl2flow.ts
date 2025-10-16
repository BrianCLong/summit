import fs from 'fs';
import { nlToFlow } from '../src/nl/translate';
import { flowLint } from '../src/lint';
const txt = fs.readFileSync(process.argv[2] || 0, 'utf8');
const flow = nlToFlow(txt);
const lint = flowLint(flow);
if (lint.find((l) => l.level === 'error')) {
  console.error(lint);
  process.exit(1);
}
console.log(JSON.stringify(flow, null, 2));
