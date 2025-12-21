import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';

import { createApp } from '../src/app.js';

const csrfToken = 'test-csrf-token';
process.env.CSRF_TOKEN = csrfToken;

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

const aiContextHeaders = fc.record({
  tenant: fc.option(fc.string({ minLength: 1, maxLength: 24 }), { nil: undefined }),
  purpose: fc.option(fc.constantFrom(...allowedPurposes, 'unauthorized'), { nil: undefined }),
  environment: fc.option(fc.constantFrom('dev', 'staging', 'production'), { nil: undefined }),
  retention: fc.option(fc.string({ maxLength: 24 }), { nil: undefined }),
});

const basePropertySettings = Object.freeze({
  numRuns: 36,
  interruptAfterTimeLimit: 5500,
  markInterruptAsFailure: true,
  logger: (message: string) => {
    if (process.env.CI) {
      // Preserve deterministic reproduction details in CI logs.
      // fast-check already shrinks on failure; this keeps the seed/path visible.
      // eslint-disable-next-line no-console
      console.log(`[fast-check] ${message}`);
    }
  },
});

function applyHeaders(builder: request.Test, headers: fc.TypeOf<typeof aiContextHeaders>) {
  let next = builder.set('x-csrf-token', csrfToken);
  if (headers.tenant) {
    next = next.set('x-tenant', headers.tenant);
  }
  if (headers.purpose) {
    next = next.set('x-purpose', headers.purpose);
  }
  if (headers.environment) {
    next = next.set('x-env', headers.environment);
  }
  if (headers.retention) {
    next = next.set('x-retention', headers.retention);
  }
  return next;
}

function deterministicSettings(seed: number) {
  return { ...basePropertySettings, seed };
}

describe('gateway fuzz safety', () => {
  const { app } = createApp({ environment: 'test' });

  it('fuzzes GraphQL inputs without crashes or policy bypass', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('plan', 'generate'),
        fc.record({
          headers: aiContextHeaders,
          objective: fc.string({ maxLength: 72 }),
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

          const response = await applyHeaders(
            request(app).post('/graphql'),
            sample.headers,
          ).send({ query, variables });

          const missingTenant = !sample.headers.tenant;
          const invalidPurpose =
            sample.headers.purpose !== undefined &&
            !allowedPurposes.has(sample.headers.purpose);

          expect(response.status).toBeLessThan(500);

          if (missingTenant) {
            expect(response.status).toBe(400);
            return;
          }

          if (invalidPurpose) {
            expect(response.status).toBe(403);
            return;
          }

          if (operation === 'generate' && sample.toolSchemaJson === '{"tools":[') {
            expect(response.status).toBe(400);
          }
        },
      ),
      deterministicSettings(133742),
    );
  });

  it('keeps REST payload validation and policy gates intact under fuzzing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/v1/plan', '/v1/generate'),
        fc.record({
          headers: aiContextHeaders,
          objective: fc.option(fc.string({ maxLength: 96 }), { nil: undefined }),
        }),
        async (endpoint, sample) => {
          const response = await applyHeaders(
            request(app).post(endpoint),
            sample.headers,
          ).send({ objective: sample.objective ?? '' });

          const missingTenant = !sample.headers.tenant;
          const invalidPurpose =
            sample.headers.purpose !== undefined &&
            !allowedPurposes.has(sample.headers.purpose);

          expect(response.status).toBeLessThan(500);

          if (missingTenant) {
            expect(response.status).toBe(400);
            return;
          }

          if (invalidPurpose) {
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
      deterministicSettings(933742),
    );
  });

  it('keeps query parameter filters bounded for model discovery', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          headers: aiContextHeaders,
          query: fc.record({
            local: fc.option(fc.boolean(), { nil: undefined }),
            modality: fc.option(fc.string({ maxLength: 16 }), { nil: undefined }),
            family: fc.option(fc.string({ maxLength: 16 }), { nil: undefined }),
            license: fc.option(fc.string({ maxLength: 16 }), { nil: undefined }),
          }),
        }),
        async (sample) => {
          const response = await applyHeaders(
            request(app)
              .get('/v1/models')
              .query({
                local: sample.query.local === undefined ? undefined : String(sample.query.local),
                modality: sample.query.modality,
                family: sample.query.family,
                license: sample.query.license,
              }),
            sample.headers,
          );

          const missingTenant = !sample.headers.tenant;
          const invalidPurpose =
            sample.headers.purpose !== undefined &&
            !allowedPurposes.has(sample.headers.purpose);

          expect(response.status).toBeLessThan(500);

          if (missingTenant) {
            expect(response.status).toBe(400);
            return;
          }

          if (invalidPurpose) {
            expect(response.status).toBe(403);
            return;
          }

          expect(Array.isArray(response.body?.models)).toBe(true);
        },
      ),
      deterministicSettings(202504),
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
              .set('x-csrf-token', csrfToken)
              .set('x-tenant', 'fuzz-tenant')
              .set('x-purpose', 'investigation')
              .send({ objective: 'traversal-probe' });

          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.status).toBeLessThan(500);
        },
      ),
      deterministicSettings(424242),
    );
  });
});
