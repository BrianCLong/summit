import fs from 'fs';
import yaml from 'js-yaml';
const bp = yaml.load(fs.readFileSync(process.argv[2], 'utf8')) as any;
const name = process.argv[3];
function exists(p: string) {
  try {
    fs.accessSync(p.replace(/\$\{name\}/g, name));
    return true;
  } catch {
    return false;
  }
}
function grep(p: string, s: string) {
  try {
    return fs.readFileSync(p.replace(/\$\{name\}/g, name), 'utf8').includes(s);
  } catch {
    return false;
  }
}
function pkgHas(k: string) {
  try {
    const j = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return k.split('.').reduce((a, c) => a?.[c], j) !== undefined;
  } catch {
    return false;
  }
}
function workflowHas(job: string) {
  try {
    return fs.readFileSync('.github/workflows/ci.yml', 'utf8').includes(job);
  } catch {
    return false;
  }
}
let score = 0;
for (const r of bp.scorecard.rules) {
  const q = r.query;
  const ok = q.startsWith('exists(')
    ? exists(q.slice(8, -2))
    : q.startsWith('grep(')
      ? (() => {
          const [p, s] = q.slice(5, -2).split("','");
          return grep(p.replace(/'/g, ''), s);
        })()
      : q.startsWith('packageJsonHas(')
        ? pkgHas(q.slice(16, -2).replace(/'/g, ''))
        : q.startsWith('workflowHasJob(')
          ? workflowHas(q.slice(16, -2).replace(/'/g, ''))
          : false;
  if (ok) score += r.weight;
}
console.log(JSON.stringify({ score }));
if (score < bp.threshold) process.exit(1);
