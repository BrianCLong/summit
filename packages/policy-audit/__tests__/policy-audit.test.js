const fs = require('fs');
const path = require('path');
const { PolicyAudit, verifyAuditChain, verifyAuditChainDetailed } = require('..');
const fixtures = require('../../../contracts/policy/fixtures.json');

const policyDir = path.join(__dirname, '../../../contracts/policy');
const auditDir = path.join(__dirname, '../../../tmp-audit');

jest.setTimeout(60000);

beforeAll(() => {
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
});

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
    input: {
      subject,
      resource,
      action: scenario.action,
      context,
    },
    expect: scenario.expect,
  };
}

function expand(map, ref) {
  if (!ref) return {};
  if (typeof ref === 'string') {
    if (!map[ref]) throw new Error(`Missing fixture reference ${ref}`);
    return JSON.parse(JSON.stringify(map[ref]));
  }
  return JSON.parse(JSON.stringify(ref));
}

function createAudit() {
  return new PolicyAudit({ policyDir, auditDir });
}

test('allows authorized access paths', async () => {
  const pa = createAudit();
  const { input, expect: expected } = materialize('analyst dossier investigation allow');
  const decision = await pa.evaluate(input);
  expect(decision).toEqual(expected);
  const contractor = materialize('contractor maintenance authorized');
  const contractorDecision = await pa.evaluate(contractor.input);
  expect(contractorDecision).toEqual(contractor.expect);
  await pa.close();
});

test('denies with specific reasons', async () => {
  const pa = createAudit();
  const scenarios = [
    'secret analyst insufficient clearance',
    'analyst ledger license mismatch',
    'auditor ledger wrong purpose',
    'analyst dossier wrong role',
    'analyst dossier tenant mismatch',
    'contractor maintenance wrong action',
  ];
  for (const name of scenarios) {
    const { input, expect: expected } = materialize(name);
    const decision = await pa.evaluate(input);
    expect(decision).toEqual(expected);
  }
  await pa.close();
});

test('evaluateAndAudit chains decision and persists logs', async () => {
  const pa = createAudit();
  const { input } = materialize('analyst dossier investigation allow');
  const result = await pa.evaluateAndAudit(input);
  expect(result).toEqual({ allow: true, reason: 'authorized' });
  const file = path.join(
    auditDir,
    fs.readdirSync(auditDir).find((f) => f.endsWith('.log')),
  );
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  expect(lines.length).toBeGreaterThan(0);
  const last = JSON.parse(lines[lines.length - 1]);
  expect(last.reason).toBe('authorized');
  expect(verifyAuditChain(file)).toBe(true);
  await pa.close();
});

test('audit method guards required fields', async () => {
  const pa = createAudit();
  await expect(
    pa.audit({ decision: 'allow', reason: 'ok', subject: {} }),
  ).rejects.toThrow('decision, reason, subject, and resource required');
  await pa.close();
});

test('tampering invalidates the audit chain', async () => {
  const pa = createAudit();
  const { input } = materialize('analyst dossier investigation allow');
  await pa.evaluateAndAudit(input);
  await pa.close();
  const file = path.join(
    auditDir,
    fs.readdirSync(auditDir).find((f) => f.endsWith('.log')),
  );
  expect(verifyAuditChain(file)).toBe(true);
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const first = JSON.parse(lines[0]);
  first.reason = 'tampered';
  lines[0] = JSON.stringify(first);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  expect(verifyAuditChain(file)).toBe(false);
  const detail = verifyAuditChainDetailed(file);
  expect(detail.valid).toBe(false);
  expect(detail.index).toBe(0);
});

test('baseUrl exposes the OPA endpoint once bootstrapped', async () => {
  const pa = createAudit();
  const url = await pa.baseUrl();
  expect(url).toMatch(/^http:\/\//);
  await pa.close();
});
