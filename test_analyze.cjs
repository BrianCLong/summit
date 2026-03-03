const fs = require('fs');
const r = JSON.parse(fs.readFileSync('artifact/report.json','utf8'));
console.log(r.findings.slice(0, 5));
