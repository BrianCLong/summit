const fs = require('fs');
module.exports = function (record) {
  fs.mkdirSync('docs/ops/audit', { recursive: true });
  fs.appendFileSync(
    'docs/ops/audit/access.ndjson',
    JSON.stringify({ ts: Date.now(), ...record }) + '\n',
  );
};
