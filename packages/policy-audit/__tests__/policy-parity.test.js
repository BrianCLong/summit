const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const fixtures = require('../../../contracts/policy/fixtures.json');
const { PolicyAudit } = require('..');
const { resolveOpa } = require('../opa');

const policyDir = path.join(__dirname, '../../../contracts/policy');
const auditDir = path.join(__dirname, '../../../tmp-parity');
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

test('OPA CLI evaluation matches HTTP evaluation', async () => {
  const pa = new PolicyAudit({ policyDir, auditDir });
  const opaPath = await resolveOpa();
  const scenarios = fixtures.cases.slice(0, 5);
  for (const scenario of scenarios) {
    const subject = expand(fixtures.subjects, scenario.subject);
    const resource = expand(fixtures.resources, scenario.resource);
    const context = expand(fixtures.contexts, scenario.context);
    const input = { subject, resource, action: scenario.action, context };
    const httpDecision = await pa.evaluate(input);
    const cliDecision = await evaluateCli(opaPath, input);
    expect(cliDecision).toEqual(httpDecision);
  }
  await pa.close();
});

async function evaluateCli(opaPath, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(opaPath, [
      'eval',
      '--format=json',
      '--data',
      policyDir,
      '--stdin-input',
      'data.policy.decision',
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `OPA exited with code ${code}`));
        return;
      }
      try {
        const payload = JSON.parse(stdout);
        const value = payload.result?.[0]?.expressions?.[0]?.value;
        if (!value) {
          reject(new Error('OPA CLI response missing decision value'));
          return;
        }
        resolve({ allow: Boolean(value.allow), reason: value.reason });
      } catch (err) {
        reject(err);
      }
    });
    child.stdin.end(JSON.stringify(input) + '\n');
  });
}
