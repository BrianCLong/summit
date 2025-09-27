const fs = require('fs');
const path = require('path');
const { PolicyAudit } = require('..');
const fixtures = require('../../../contracts/policy/fixtures.json');

const policyDir = path.join(__dirname, '../../../contracts/policy');
const auditDir = path.join(__dirname, '../../../tmp-matrix');

jest.setTimeout(60000);

beforeAll(() => {
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
});

function expand(map, ref) {
  if (!ref) return {};
  if (typeof ref === 'string') {
    return JSON.parse(JSON.stringify(map[ref]));
  }
  return JSON.parse(JSON.stringify(ref));
}

test('policy decision matrix matches snapshot', async () => {
  const pa = new PolicyAudit({ policyDir, auditDir });
  const results = [];
  for (const scenario of fixtures.cases) {
    const subject = expand(fixtures.subjects, scenario.subject);
    const resource = expand(fixtures.resources, scenario.resource);
    const context = expand(fixtures.contexts, scenario.context);
    const decision = await pa.evaluate({
      subject,
      resource,
      action: scenario.action,
      context,
    });
    expect(decision).toEqual(scenario.expect);
    results.push({ name: scenario.name, allow: decision.allow, reason: decision.reason });
  }
  await pa.close();
  expect(results).toMatchSnapshot();
});
