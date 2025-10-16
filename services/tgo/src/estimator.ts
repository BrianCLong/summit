import fs from 'fs';
const hist = JSON.parse(fs.readFileSync('tools/ci/durations.json', 'utf8')); // { testPath: avgSec }
export const est = (files: string[]) =>
  Math.max(15, files.reduce((s, f) => s + (hist[f] || 20), 0) / 4);
