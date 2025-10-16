import fs from 'fs';
import { execSync } from 'child_process';

const risk = JSON.parse(fs.readFileSync('risk.json', 'utf8')); // from v1.13
const tiaCount = safeRead('tia-tests.txt').split('\n').filter(Boolean).length;
const diff = Number(
  execSync(
    "git diff --shortstat origin/${GITHUB_BASE_REF}...HEAD | awk '{print $4+$6}'",
    { shell: 'bash' },
  ).toString() || 0,
);
const flakeRate = Number(process.env.FLAKE_RATE || '0.02'); // from your flake hunter metrics
const coverage = Number(process.env.COVERAGE_PCT || '80'); // from jest --coverage in basal

// simple logistic-ish score
let s = 100;
s -= Math.min((diff / 600) * 20, 20); // size hurts
s -= risk.bucket === 'medium' ? 10 : risk.bucket === 'high' ? 25 : 0;
s -= Math.min(flakeRate * 100, 20);
s += Math.min(coverage - 70, 20) * 0.5; // high coverage helps
s -= Math.max(0, 8 - Math.min(tiaCount, 8)) * 2; // too few targeted tests hurts

const score = Math.max(0, Math.min(100, Math.round(s)));
fs.writeFileSync(
  'merge-confidence.json',
  JSON.stringify(
    { score, tiaCount, diff, risk: risk.bucket, flakeRate, coverage },
    null,
    2,
  ),
);
console.log(`::notice ::merge_confidence=${score}`);

function safeRead(file: string) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}
