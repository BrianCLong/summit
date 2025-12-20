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

const basePropertySettings = Object.freeze({
  numRuns: 36,
  interruptAfterTimeLimit: 5500,
  markInterruptAsFailure: true,
});

const deterministicSettings = (seed: number) => ({ ...basePropertySettings, seed });

const aiContextHeaders = fc.record({
  tenant: fc.oneof(fc.constant('fuzz-tenant'), fc.string({ maxLength: 24 }), fc.constant('')),
  purpose: fc.oneof(
    fc.constantFrom(...allowedPurposes),
    fc
      .string({ maxLength: 24 })
      .filter((candidate) => !allowedPurposes.has(candidate)),
  ),
  caseId: fc.option(fc.string({ maxLength: 18 }), { nil: undefined }),
  environment: fc.option(fc.constantFrom('dev', 'staging', 'qa', 'prod'), { nil: undefined }),
  retention: fc.option(fc.string({ maxLength: 24 }), { nil: undefined }),
  allowPaid: fc.boolean(),
});

function applyHeaders(
  builder: request.Test,
  headers: fc.TypeOf<typeof aiContextHeaders>,
): request.Test {
  if (headers.tenant !== undefined) {
    builder.set('x-tenant', headers.tenant);
  }
  if (headers.purpose !== undefined) {
    builder.set('x-purpose', headers.purpose);
  }
  if (headers.caseId) {
    builder.set('x-case', headers.caseId);
  }
  if (headers.environment) {
    builder.set('x-env', headers.environment);
  }
  if (headers.retention) {
    builder.set('x-retention', headers.retention);
  }
  builder.set('x-allow-paid', headers.allowPaid ? 'true' : 'false');
  return builder;
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
      deterministicSettings(424242),
    );
  });
});
