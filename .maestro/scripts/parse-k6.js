const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const p95_target = parseFloat(args[args.indexOf('--p95') + 1]);
const error_rate_target = parseFloat(args[args.indexOf('--errorRate') + 1]);

const k6_output = JSON.parse(fs.readFileSync(0, 'utf8')); // Read from stdin

const p95_actual = k6_output.metrics.http_req_duration.p95;
const error_rate_actual = k6_output.metrics.http_req_failed.rate;

const result = {
  p95_actual: p95_actual,
  p95_target: p95_target,
  error_rate_actual: error_rate_actual,
  error_rate_target: error_rate_target,
  p95_pass: p95_actual <= p95_target,
  error_rate_pass: error_rate_actual <= error_rate_target,
};

console.log(JSON.stringify(result, null, 2));

if (!result.p95_pass || !result.error_rate_pass) {
  process.exit(1);
}
