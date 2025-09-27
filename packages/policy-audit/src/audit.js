const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function audit(entry, logDir = '.') {
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(logDir, `audit-${date}.log`);
  let prevHash = '';
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    if (lines.length > 0) {
      prevHash = JSON.parse(lines[lines.length - 1]).hash;
    }
  }
  const data = {
    ...entry,
    timestamp: new Date().toISOString(),
    prevHash,
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const record = { ...data, hash };
  fs.appendFileSync(file, JSON.stringify(record) + '\n');
  return { auditId: hash };
}

function verify(file) {
  if (!fs.existsSync(file)) return false;
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  let prevHash = '';
  for (const line of lines) {
    const entry = JSON.parse(line);
    const { hash, ...data } = entry;
    const calc = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    if (entry.prevHash !== prevHash || calc !== hash) return false;
    prevHash = hash;
  }
  return true;
}

module.exports = { audit, verify };
