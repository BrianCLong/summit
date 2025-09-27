import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { writeAuditLog, resetAuditState } from '../src/audit/auditLogger.js';

describe('audit verify', () => {
  const file = path.join(__dirname, 'audit-test.log');
  beforeEach(() => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    process.env.AUDIT_LOG_FILE = file;
    resetAuditState();
  });
  afterEach(() => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });

  it('detects tampering', async () => {
    await writeAuditLog({ user: 'u1', action: 'create', resource: 'Entity', decision: 'allow' });
    await writeAuditLog({ user: 'u1', action: 'update', resource: 'Entity', decision: 'allow' });
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    const tampered = JSON.parse(lines[0]);
    tampered.user = 'evil';
    fs.writeFileSync(file, [JSON.stringify(tampered), lines[1]].join('\n') + '\n');
    let failed = false;
    try {
      execSync(`node ../../scripts/audit_verify.mjs ${file}`);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});
