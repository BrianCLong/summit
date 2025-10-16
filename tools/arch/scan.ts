import fg from 'fast-glob';
import fs from 'fs';
const files = fg.sync([
  'server/src/**/*.ts',
  'services/**/src/**/*.ts',
  'charts/**/*.yaml',
]);
const data = {
  files,
  hasCilium: files.some((f) => /charts\/flow-audit/.test(f)),
};
fs.writeFileSync('arch_scan.json', JSON.stringify(data, null, 2));
