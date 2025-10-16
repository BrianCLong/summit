const fs = require('fs');
let mc = JSON.parse(fs.readFileSync('merge-confidence.json', 'utf8'));
const prob = Number(process.env.FAIL_PROB || 0); // inject from service
const pass = mc.score >= 85 && prob < 0.3;
console.log(
  JSON.stringify({ mergeConfidence: mc.score, failProb: prob, pass }, null, 2),
);
if (!pass) process.exit(1);
