const fs = require('fs');
const summary = JSON.parse(fs.readFileSync('summary.json','utf8'));
const p95 = summary.metrics['http_req_duration'].percentiles['p(95)'];
const err = (summary.metrics.http_req_failed?.passes || 0) / (summary.metrics.http_reqs.count || 1) * 100;
const p95Budget = Number(process.argv[process.argv.indexOf('--p95')+1]);
const errBudget = Number(process.argv[process.argv.indexOf('--errorRate')+1]);
if (p95 > p95Budget) { console.error(`FAIL p95 ${p95}ms > ${p95Budget}ms`); process.exit(1); }
if (err > errBudget) { console.error(`FAIL error ${err}% > ${errBudget}%`); process.exit(1); }
console.log('SLO OK');
