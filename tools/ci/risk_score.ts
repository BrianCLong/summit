import { execSync } from 'node:child_process';
import fs from 'fs';
const changed = execSync(
  'git diff --name-only origin/${GITHUB_BASE_REF}...HEAD',
)
  .toString()
  .trim()
  .split('\n');

const SIZE = Number(
  execSync(
    "git diff --shortstat origin/${GITHUB_BASE_REF}...HEAD | awk '{print $4+$6}'",
    { shell: 'bash' },
  ).toString() || 0,
);
const HOT = [
  'server/src/steps',
  'server/src/scheduler',
  'services/conductor/src',
].some((p) => changed.some((f) => f.startsWith(p)));
const CFG = changed.filter((f) =>
  /charts\/|helm\/|\.github\/workflows\//.test(f),
).length;
const TEST = changed.filter((f) => /\.test\./.test(f)).length;
const FLAKE_TOUCH = changed.some((f) => /test|jest|playwright/.test(f));

let score = 0;
score += Math.min(SIZE / 800, 2); // size up to +2
score += HOT ? 2 : 0; // hot path +2
score += CFG ? 1 : 0; // infra change +1
score -= TEST ? 0.5 : 0; // tests lower risk
score += FLAKE_TOUCH ? 0.5 : 0;

const bucket = score >= 3 ? 'high' : score >= 1.5 ? 'medium' : 'low';
fs.writeFileSync(
  'risk.json',
  JSON.stringify({ score, bucket, SIZE, HOT, CFG, TEST, FLAKE_TOUCH }, null, 2),
);
console.log(`::notice ::risk=${bucket} score=${score.toFixed(2)}`);
if (process.env.SET_LABELS === 'true') {
  console.log(`::set-output name=risk::${bucket}`);
}
