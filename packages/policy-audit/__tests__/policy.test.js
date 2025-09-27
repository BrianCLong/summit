const fs = require('fs');
const path = require('path');
const os = require('os');
const { PolicyHttpClient } = require('../src/policy.js');
const { PolicyAudit } = require('..');
const fixtures = require('../../../contracts/policy/fixtures.json');

const policyDir = path.join(__dirname, '../../../contracts/policy');

describe('PolicyHttpClient', () => {
  test('mirrors PolicyAudit decisions', async () => {
    const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-http-'));
    const pa = new PolicyAudit({ policyDir, auditDir });
    const baseUrl = await pa.baseUrl();
    const client = new PolicyHttpClient({ baseUrl });
    for (const scenario of fixtures.cases.slice(0, 5)) {
      const subject = expand(fixtures.subjects, scenario.subject);
      const resource = expand(fixtures.resources, scenario.resource);
      const context = expand(fixtures.contexts, scenario.context);
      const decision = await client.evaluate({ subject, resource, action: scenario.action, context });
      expect(decision).toEqual(scenario.expect);
    }
    await pa.close();
  });
});

function expand(map, ref) {
  if (!ref) return {};
  if (typeof ref === 'string') {
    return JSON.parse(JSON.stringify(map[ref]));
  }
  return JSON.parse(JSON.stringify(ref));
}
