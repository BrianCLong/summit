const fs = require('fs');
const path = require('path');
const http = require('http');
const fixtures = require('../../../contracts/policy/fixtures.json');
const { verifyAuditChain } = require('..');
const { createServer } = require('../../../services/policy-sidecar/server');

const policyDir = path.join(__dirname, '../../../contracts/policy');
const auditDir = path.join(__dirname, '../../../tmp-sidecar-audit');

beforeAll(() => {
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
});

jest.setTimeout(60000);

afterEach(() => {
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
});

function materialize(name) {
  const scenario = fixtures.cases.find((c) => c.name === name);
  if (!scenario) throw new Error(`Unknown scenario ${name}`);
  const subject = expand(fixtures.subjects, scenario.subject);
  const resource = expand(fixtures.resources, scenario.resource);
  const context = expand(fixtures.contexts, scenario.context);
  return {
    subject,
    action: scenario.action,
    resource,
    context,
    expect: scenario.expect,
  };
}

function expand(map, ref) {
  if (!ref) return {};
  if (typeof ref === 'string') {
    return JSON.parse(JSON.stringify(map[ref]));
  }
  return JSON.parse(JSON.stringify(ref));
}

test('sidecar eval and audit endpoints', async () => {
  const server = createServer({ policyDir, auditDir });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const scenario = materialize('analyst dossier investigation allow');
  const evalRes = await request(port, '/v0/eval', scenario);
  expect(evalRes).toEqual(scenario.expect);
  const auditRes = await request(port, '/v0/audit', {
    decision: 'allow',
    reason: 'authorized',
    subject: scenario.subject,
    resource: scenario.resource,
  });
  expect(auditRes.auditId).toBeDefined();
  await new Promise((resolve) => server.close(resolve));

  const file = path.join(
    auditDir,
    fs.readdirSync(auditDir).find((f) => f.endsWith('.log')),
  );
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const rec = JSON.parse(lines[0]);
  expect(rec.reason).toBe('authorized');
  expect(verifyAuditChain(file)).toBe(true);
  // tamper attempt should break chain
  rec.reason = 'tampered';
  fs.writeFileSync(file, JSON.stringify(rec) + '\n');
  expect(verifyAuditChain(file)).toBe(false);
});

test('sidecar returns denial reasons', async () => {
  const server = createServer({ policyDir, auditDir });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const scenario = materialize('auditor ledger wrong purpose');
  const res = await request(port, '/v0/eval', scenario);
  expect(res).toEqual(scenario.expect);
  await new Promise((resolve) => server.close(resolve));
});

test('audit endpoint validates fields', async () => {
  const server = createServer({ policyDir, auditDir });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const res = await request(port, '/v0/audit', { decision: 'allow' });
  expect(res.error).toMatch('decision, reason, subject, and resource required');
  await new Promise((resolve) => server.close(resolve));
});

function request(port, route, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: route,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = http.request(opts, (res) => {
      let resp = '';
      res.on('data', (chunk) => (resp += chunk));
      res.on('end', () => resolve(JSON.parse(resp)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
