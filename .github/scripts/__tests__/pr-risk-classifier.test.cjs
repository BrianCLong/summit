const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { classifyRiskTiers, buildCommentBody, tierRules } = require('../pr-risk-classifier.cjs');

describe('pr-risk-classifier', () => {
  test('classifies files into expected tiers with distinct reasons', () => {
    const files = [
      'server/db/migrations/20240101_add_users.sql',
      'deploy/charts/api/values.yaml',
      'services/api/routes/user.js',
      'security/opa/policy.rego',
      'README.md',
    ];

    const matches = classifyRiskTiers(files);

    assert.deepEqual(Object.keys(matches).sort(), ['api', 'infra', 'safety', 'schema']);
    assert.ok(matches.schema.some((reason) => reason.includes('migrations')));
    assert.ok(matches.infra.some((reason) => reason.includes('Helm chart updated')));
    assert.ok(matches.api.some((reason) => reason.includes('Service endpoint changed')));
    assert.ok(matches.safety.some((reason) => reason.includes('OPA/Rego policy changed')));
    assert.ok(!matches.api.some((reason) => reason.includes('README')));
  });

  test('deduplicates reasons for the same tier', () => {
    const files = ['db/schema.prisma', 'prisma/schema.prisma'];
    const matches = classifyRiskTiers(files);

    assert.equal(matches.schema.length, 3);
    const dedupedSchemaDefinition = matches.schema.filter((reason) =>
      reason.includes('Schema definition updated') &&
      reason.includes('db/schema.prisma') &&
      reason.includes('prisma/schema.prisma'),
    );
    assert.equal(dedupedSchemaDefinition.length, 1);
  });

  test('builds a readable comment body', () => {
    const matches = {
      schema: ['Migration files modified (db/migrations/001.sql)'],
      infra: [
        'CI/CD workflow changed (.github/workflows/pr-validation.yml)',
        'Docker Compose definition changed (deploy/docker-compose.yml)',
      ],
    };
    const files = ['db/migrations/001.sql', '.github/workflows/pr-validation.yml', 'deploy/docker-compose.yml'];

    const body = buildCommentBody(matches, files);

    assert.match(body, /PR risk tiers/);
    assert.match(body, /schema:/);
    assert.match(body, /infra:/);
    assert.match(body, /Analyzed 3 changed file\(s\)\./);
  });

  test('has non-empty tier rules for all tiers', () => {
    ['schema', 'infra', 'api', 'safety'].forEach((tier) => {
      assert.ok(Array.isArray(tierRules[tier]));
      assert.ok(tierRules[tier].length > 0, `${tier} should have at least one rule`);
    });
  });
});
