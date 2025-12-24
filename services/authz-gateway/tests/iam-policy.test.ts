import fs from 'fs';
import path from 'path';

function evaluatePolicy(input: any): string[] {
  const messages: string[] = [];
  if (input.resource.type === 'aws_iam_policy') {
    (input.resource.statement ?? []).forEach((statement: any) => {
      if (statement.effect === 'Allow' && (statement.action ?? []).includes('*')) {
        messages.push(`Deny wildcard IAM actions on ${input.resource.name}`);
      }
      if (statement.effect === 'Allow' && (statement.resource ?? []).includes('*')) {
        messages.push(`Deny wildcard resources on ${input.resource.name}`);
      }
    });
    if (!input.resource.tags?.env) {
      messages.push(`IAM policy ${input.resource.name} missing required tag env`);
    }
  }
  if (input.resource.public === true) {
    messages.push(`Resource ${input.resource.name} cannot be public`);
  }
  return messages;
}

describe('IAM guardrails', () => {
  it('blocks wildcard and public exposure', () => {
    const sampleInput = {
      resource: {
        type: 'aws_iam_policy',
        name: 'pilot-ci-role',
        public: true,
        tags: {},
        statement: [
          { effect: 'Allow', action: ['*'], resource: ['arn:aws:s3:::bucket/*'] },
          { effect: 'Allow', action: ['s3:GetObject'], resource: ['*'] },
        ],
      },
    };
    const denies = evaluatePolicy(sampleInput);
    expect(denies).toContain('Deny wildcard IAM actions on pilot-ci-role');
    expect(denies).toContain('Deny wildcard resources on pilot-ci-role');
    expect(denies).toContain('Resource pilot-ci-role cannot be public');
    expect(denies).toContain('IAM policy pilot-ci-role missing required tag env');
  });

  it('passes minimally scoped role', () => {
    const sampleInput = {
      resource: {
        type: 'aws_iam_policy',
        name: 'pilot-ci-role',
        public: false,
        tags: { env: 'stage' },
        statement: [{ effect: 'Allow', action: ['sts:AssumeRole'], resource: ['arn:aws:iam::123:role/pilot'] }],
      },
    };
    expect(evaluatePolicy(sampleInput)).toHaveLength(0);
  });

  it('ships rego file alongside evaluation harness', () => {
    const regoPath = path.join(__dirname, '..', 'policy', 'phase1', 'iam.rego');
    expect(fs.existsSync(regoPath)).toBe(true);
  });
});
