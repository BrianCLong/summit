const fs = require('fs');
const path = require('path');
const os = require('os');
const { audit, verify } = require('../src/audit.js');

describe('audit chain', () => {
  test('tampering breaks the chain', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'));
    audit({ decision: 'allow', reason: 'ok', subject: {}, resource: {} }, dir);
    audit({ decision: 'deny', reason: 'no', subject: {}, resource: {} }, dir);
    const file = path.join(dir, `audit-${new Date().toISOString().slice(0, 10)}.log`);
    expect(verify(file)).toBe(true);
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    const first = JSON.parse(lines[0]);
    first.reason = 'tampered';
    lines[0] = JSON.stringify(first);
    fs.writeFileSync(file, lines.join('\n') + '\n');
    expect(verify(file)).toBe(false);
  });
});
