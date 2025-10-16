const fs = require('fs');
const risk = JSON.parse(fs.readFileSync('risk.json', 'utf8'));
const mc = JSON.parse(fs.readFileSync('merge-confidence.json', 'utf8'));
let mut = 0;
try {
  mut = JSON.parse(fs.readFileSync('mutation.json', 'utf8')).mutationScore || 0;
} catch {}
const tips = [];
if (mc.tiaCount < 6)
  tips.push('Add/target tests for changed files (TIA selected <6).');
if (mut < 65)
  tips.push(
    `Mutation score low (${mut}). Strengthen assertions or cover branches.`,
  );
if (risk.bucket !== 'low')
  tips.push(`Risk=${risk.bucket}. Split PR or add owners/extra tests.`);
const pass = mc.score >= 85 && (mut === 0 || mut >= 65);
console.log(
  JSON.stringify(
    { pass, risk: risk.bucket, mergeConfidence: mc.score, mutation: mut, tips },
    null,
    2,
  ),
);
if (!pass) process.exit(1);
