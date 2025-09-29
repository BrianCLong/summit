import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { writeAuditLog, resetAuditState } from '../src/audit/auditLogger.js';

describe('audit logger', () => {
  const file = path.join(__dirname, 'audit-test.log');
  beforeEach(() => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    process.env.AUDIT_LOG_FILE = file;
    resetAuditState();
  });
  afterEach(() => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });

  it('chains hashes and validates hmac', async () => {
    await writeAuditLog({
      user: 'u1',
      action: 'create',
      resource: 'Entity',
      decision: 'allow',
    });
    await writeAuditLog({
      user: 'u1',
      action: 'update',
      resource: 'Entity',
      decision: 'allow',
    });
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    const first = JSON.parse(lines[0]);
    const second = JSON.parse(lines[1]);
    expect(second.prevHash).toBe(first.hash);
    const hmac = crypto
      .createHmac('sha256', process.env.AUDIT_HMAC_KEY || 'dev_audit_key')
      .update(first.hash)
      .digest('hex');
    expect(first.hmac).toBe(hmac);
  });
});
