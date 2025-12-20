import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';

import { createApp } from '../src/app.js';

const gqlPlanQuery = `
  query Plan($input: PlanInput!) {
    plan(input: $input) {
      summary
      policy
    }
  }
`;

const gqlGenerateMutation = `
  mutation Generate($input: GenerateInput!) {
    generate(input: $input) {
      model {
        id
        license
      }
      citations {
        uri
      }
    }
  }
`;

const allowedPurposes = new Set([
  'investigation',
  'fraud-risk',
  'demo',
]);

const propertySettings = {
  seed: 133742,
  numRuns: 32,
  interruptAfterTimeLimit: 6000,
  markInterruptAsFailure: true,
  logger: (message: string) => {
    if (process.env.CI) {
      // Preserve deterministic reproduction details in CI logs.
      // fast-check already shrinks on failure; this keeps the seed/path visible.
      // eslint-disable-next-line no-console
      console.log(`[fast-check] ${message}`);
    }
  },
};

describe('gateway fuzz safety', () => {
  const { app } = createApp({ environment: 'test' });

  it('fuzzes GraphQL inputs without crashes or policy bypass', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('plan', 'generate'),
        fc.record({
          objective: fc.string({ maxLength: 72 }),
          purpose: fc.oneof(
            fc.constantFrom(...allowedPurposes),
            fc
              .string({ maxLength: 24 })
              .filter((candidate) => !allowedPurposes.has(candidate)),
          ),
          traversal: fc.stringOf(fc.constantFrom('.', '/', '-', '_'), {
            minLength: 1,
            maxLength: 12,
          }),
          toolSchemaJson: fc.option(
            fc.oneof(
              fc.constant('{"tools":[{"name":"audit"}]}'),
              fc.constant('{"tools":['),
            ),
            { nil: undefined },
          ),
        }),
        async (operation, sample) => {
          const query = operation === 'plan' ? gqlPlanQuery : gqlGenerateMutation;
          const variables =
            operation === 'plan'
              ? {
                  input: {
                    objective: sample.objective,
                    sources: [`/evidence/${sample.traversal}`],
                    requiresMultimodal: false,
                  },
                }
              : {
                  input: {
                    objective: sample.objective,
                    attachments: [
                      {
                        uri: `/tmp/${sample.traversal}`,
                        type: 'file',
                      },
                    ],
                    toolSchemaJson: sample.toolSchemaJson ?? undefined,
                  },
                };

          const response = await request(app)
            .post('/graphql')
            .set('x-tenant', 'fuzz-tenant')
            .set('x-purpose', sample.purpose)
            .send({ query, variables });

          expect(response.status).toBeLessThan(500);
          if (!allowedPurposes.has(sample.purpose)) {
            expect(response.status).toBe(403);
          }
          if (operation === 'generate' && sample.toolSchemaJson === '{"tools":[') {
            expect(response.status).toBe(400);
          }
        },
      ),
      propertySettings,
    );
  });

  it('keeps REST payload validation and policy gates intact under fuzzing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/v1/plan', '/v1/generate'),
        fc.record({
          objective: fc.option(fc.string({ maxLength: 96 }), { nil: undefined }),
          purpose: fc.oneof(
            fc.constantFrom(...allowedPurposes),
            fc
              .string({ maxLength: 24 })
              .filter((candidate) => !allowedPurposes.has(candidate)),
          ),
          allowPaid: fc.boolean(),
        }),
        async (endpoint, sample) => {
          const response = await request(app)
            .post(endpoint)
            .set('x-tenant', 'fuzz-tenant')
            .set('x-purpose', sample.purpose)
            .set('x-allow-paid', sample.allowPaid ? 'true' : 'false')
            .send({ objective: sample.objective ?? '' });

          expect(response.status).toBeLessThan(500);
          if (!allowedPurposes.has(sample.purpose)) {
            expect(response.status).toBe(403);
            return;
          }

          if (!sample.objective) {
            expect(response.status).toBe(400);
          } else {
            expect([200, 403]).toContain(response.status);
          }
        },
      ),
      propertySettings,
    );
  });

  it('keeps model listing params and headers bounded and sanitized under fuzzing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          local: fc.option(fc.boolean(), { nil: undefined }),
          modality: fc.oneof(
            fc.stringOf(fc.constantFrom('a', 'b', 'c', '.', '/', '-'), {
              maxLength: 12,
            }),
            fc.constant(undefined),
          ),
          family: fc.option(fc.string({ maxLength: 18 }), { nil: undefined }),
          license: fc.option(fc.string({ maxLength: 14 }), { nil: undefined }),
          purpose: fc.oneof(
            fc.constantFrom(...allowedPurposes),
            fc
              .string({ maxLength: 24 })
              .filter((candidate) => !allowedPurposes.has(candidate)),
          ),
          tenant: fc.string({ minLength: 1, maxLength: 24 }),
        }),
        async (sample) => {
          const response = await request(app)
            .get('/v1/models')
            .query({
              local:
                sample.local === undefined ? undefined : sample.local ? 'true' : 'false',
              modality: sample.modality ?? undefined,
              family: sample.family ?? undefined,
              license: sample.license ?? undefined,
            })
            .set('x-tenant', sample.tenant)
            .set('x-purpose', sample.purpose);

          expect(response.status).toBeLessThan(500);
          if (!allowedPurposes.has(sample.purpose)) {
            expect(response.status).toBe(403);
            return;
          }

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('models');
          expect(JSON.stringify(response.body)).not.toContain('..');
        },
      ),
      {
        ...propertySettings,
        seed: 987123,
        interruptAfterTimeLimit: 4000,
      },
    );
  });

  it('rejects traversal-style paths from reaching privileged endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('..', 'v1', 'internal', 'metrics'), {
          minLength: 1,
          maxLength: 3,
        }),
        async (segments) => {
          fc.pre(segments.some((segment) => segment.includes('..')));
          const pathAttempt = `/${segments.join('/')}`;
          const response = await request(app)
            .post(pathAttempt)
            .set('x-tenant', 'fuzz-tenant')
            .set('x-purpose', 'investigation')
            .send({ objective: 'traversal-probe' });

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.status).toBeLessThan(500);
        },
      ),
      { ...propertySettings, seed: 424242 },
    );
  });
});
