#!/usr/bin/env node
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const file = process.argv[2] || process.env.AUDIT_LOG_FILE || path.join('server', 'audit.log');
const secret = process.env.AUDIT_HMAC_KEY || 'dev_audit_key';

if (!fs.existsSync(file)) {
  console.error(`Audit log file not found: ${file}`);
  process.exit(1);
}

const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
let prevHash = null;
for (const [i, line] of lines.entries()) {
  const entry = JSON.parse(line);
  const base = {
    timestamp: entry.timestamp,
    user: entry.user,
    action: entry.action,
    resource: entry.resource,
    before: entry.before,
    after: entry.after,
    decision: entry.decision,
    reason: entry.reason,
    requestId: entry.requestId,
    prevHash: entry.prevHash,
    keyId: entry.keyId,
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(base)).digest('hex');
  const hmac = crypto.createHmac('sha256', secret).update(hash).digest('hex');
  if (entry.prevHash !== prevHash || entry.hash !== hash || entry.hmac !== hmac) {
    console.error(`Tamper detected at line ${i + 1}`);
    process.exit(1);
  }
  prevHash = entry.hash;
}
console.log(`Audit log verified: ${lines.length} entries`);
