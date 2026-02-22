// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

const {
  parseGateSpec,
  evaluateRequiredChecks,
  evaluateObservability,
  evaluateGovernance,
  buildReport,
} = require('../scripts/ga-gate');

describe('ga-gate utilities', () => {
  const mockSpec = {
    requiredChecks: ['tests', 'typecheck'],
    securityChecks: ['dependency-audit', 'provenance'],
    governance: {
      codeownerPaths: ['/server', '/apps/web'],
      requiredLabels: ['area/*', 'risk/*'],
      minApprovals: 2,
    },
    observability: { sloFiles: ['slo/availability.yaml'] },
  };

  it('parses the GA gate spec JSON block', () => {
    const content = [
      'Intro text',
      '<!-- GA-GATE-SPEC:START -->',
      '```json',
      '{"requiredChecks":["tests"],"securityChecks":[],"governance":{"codeownerPaths":[],"requiredLabels":[],"minApprovals":1},"observability":{"sloFiles":[]}}',
      '```',
      '<!-- GA-GATE-SPEC:END -->',
    ].join('\\n');
    const spec = parseGateSpec(content);
    expect(spec.requiredChecks).toEqual(['tests']);
  });

  it('fails required checks when any are missing', () => {
    const result = evaluateRequiredChecks(mockSpec, { tests: 0, typecheck: 1 });
    expect(result.status).toBe('fail');
    expect(result.details.find((d: any) => d.name === 'typecheck')?.status).toBe('fail');
  });

  it('validates observability files via injected file checker', () => {
    const result = evaluateObservability(
      mockSpec,
      (p: string) => p.endsWith('slo/availability.yaml') || p.endsWith('latency.yaml'),
    );
    expect(result.status).toBe('pass');
  });

  it('requires governance labels and approvals for changed paths', () => {
    const approvals = new Map();
    approvals.set('approver', '2024-01-01');
    approvals.set('approver-two', '2024-01-02');
    const result = evaluateGovernance(mockSpec, {
      labels: ['area/api', 'risk/low'],
      approvals,
      touchedFiles: ['server/api/index.ts'],
      codeowners: [
        { pattern: '/server/**', owners: ['@approver'] },
        { pattern: '/apps/web/**', owners: ['@webowner'] },
      ],
      isPullRequest: true,
    });

    expect(result.status).toBe('pass');
  });

  it('builds a GA report with verdict', () => {
    const report = buildReport({ sha: 'abc', verdict: 'pass', results: [] });
    expect(report.sha).toBe('abc');
    expect(report.verdict).toBe('pass');
    expect(typeof report.timestamp).toBe('string');
  });
});
