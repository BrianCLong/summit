import { planPR } from './plan';
import fs from 'fs';
const changed = fs
  .readFileSync('changed.txt', 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean);
const tasks = planPR(changed).filter((t) =>
  ['test', 'build', 'lint', 'policy'].includes(t.kind),
);
const matrix = {
  include: tasks.map((t) => ({ id: t.id, kind: t.kind, files: t.files || [] })),
};
process.stdout.write(JSON.stringify(matrix));
