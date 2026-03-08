"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fast_check_1 = __importDefault(require("fast-check"));
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = require("../src/app.js");
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
    logger: (message) => {
        if (process.env.CI) {
            // Preserve deterministic reproduction details in CI logs.
            // fast-check already shrinks on failure; this keeps the seed/path visible.
            // eslint-disable-next-line no-console
            console.log(`[fast-check] ${message}`);
        }
    },
});
(0, vitest_1.describe)('gateway fuzz safety', () => {
    const { app } = (0, app_js_1.createApp)({ environment: 'test' });
    (0, vitest_1.it)('fuzzes GraphQL inputs without crashes or policy bypass', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.constantFrom('plan', 'generate'), fast_check_1.default.record({
            headers: aiContextHeaders,
            objective: fast_check_1.default.string({ maxLength: 72 }),
            traversal: fast_check_1.default.stringOf(fast_check_1.default.constantFrom('.', '/', '-', '_'), {
                minLength: 1,
                maxLength: 12,
            }),
            toolSchemaJson: fast_check_1.default.option(fast_check_1.default.oneof(fast_check_1.default.constant('{"tools":[{"name":"audit"}]}'), fast_check_1.default.constant('{"tools":[')), { nil: undefined }),
        }), async (operation, sample) => {
            const query = operation === 'plan' ? gqlPlanQuery : gqlGenerateMutation;
            const variables = operation === 'plan'
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
            const response = await applyHeaders((0, supertest_1.default)(app).post('/graphql'), sample.headers).send({ query, variables });
            const missingTenant = !sample.headers.tenant;
            const invalidPurpose = sample.headers.purpose !== undefined &&
                !allowedPurposes.has(sample.headers.purpose);
            (0, vitest_1.expect)(response.status).toBeLessThan(500);
            if (missingTenant) {
                (0, vitest_1.expect)(response.status).toBe(400);
                return;
            }
            if (invalidPurpose) {
                (0, vitest_1.expect)(response.status).toBe(403);
                return;
            }
            if (operation === 'generate' && sample.toolSchemaJson === '{"tools":[') {
                (0, vitest_1.expect)(response.status).toBe(400);
            }
        }), deterministicSettings(133742));
    });
    (0, vitest_1.it)('keeps REST payload validation and policy gates intact under fuzzing', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.constantFrom('/v1/plan', '/v1/generate'), fast_check_1.default.record({
            headers: aiContextHeaders,
            objective: fast_check_1.default.option(fast_check_1.default.string({ maxLength: 96 }), { nil: undefined }),
        }), async (endpoint, sample) => {
            const response = await applyHeaders((0, supertest_1.default)(app).post(endpoint), sample.headers).send({ objective: sample.objective ?? '' });
            const missingTenant = !sample.headers.tenant;
            const invalidPurpose = sample.headers.purpose !== undefined &&
                !allowedPurposes.has(sample.headers.purpose);
            (0, vitest_1.expect)(response.status).toBeLessThan(500);
            if (missingTenant) {
                (0, vitest_1.expect)(response.status).toBe(400);
                return;
            }
            if (invalidPurpose) {
                (0, vitest_1.expect)(response.status).toBe(403);
                return;
            }
            if (!sample.objective) {
                (0, vitest_1.expect)(response.status).toBe(400);
            }
            else {
                (0, vitest_1.expect)([200, 403]).toContain(response.status);
            }
        }), deterministicSettings(933742));
    });
    (0, vitest_1.it)('keeps query parameter filters bounded for model discovery', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            headers: aiContextHeaders,
            query: fast_check_1.default.record({
                local: fast_check_1.default.option(fast_check_1.default.boolean(), { nil: undefined }),
                modality: fast_check_1.default.option(fast_check_1.default.string({ maxLength: 16 }), { nil: undefined }),
                family: fast_check_1.default.option(fast_check_1.default.string({ maxLength: 16 }), { nil: undefined }),
                license: fast_check_1.default.option(fast_check_1.default.string({ maxLength: 16 }), { nil: undefined }),
            }),
        }), async (sample) => {
            const response = await applyHeaders((0, supertest_1.default)(app)
                .get('/v1/models')
                .query({
                local: sample.query.local === undefined ? undefined : String(sample.query.local),
                modality: sample.query.modality,
                family: sample.query.family,
                license: sample.query.license,
            }), sample.headers);
            const missingTenant = !sample.headers.tenant;
            const invalidPurpose = sample.headers.purpose !== undefined &&
                !allowedPurposes.has(sample.headers.purpose);
            (0, vitest_1.expect)(response.status).toBeLessThan(500);
            if (missingTenant) {
                (0, vitest_1.expect)(response.status).toBe(400);
                return;
            }
            if (invalidPurpose) {
                (0, vitest_1.expect)(response.status).toBe(403);
                return;
            }
            (0, vitest_1.expect)(Array.isArray(response.body?.models)).toBe(true);
        }), deterministicSettings(202504));
    });
    (0, vitest_1.it)('keeps model listing params and headers bounded and sanitized under fuzzing', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.record({
            local: fast_check_1.default.option(fast_check_1.default.boolean(), { nil: undefined }),
            modality: fast_check_1.default.oneof(fast_check_1.default.stringOf(fast_check_1.default.constantFrom('a', 'b', 'c', '.', '/', '-'), {
                maxLength: 12,
            }), fast_check_1.default.constant(undefined)),
            family: fast_check_1.default.option(fast_check_1.default.string({ maxLength: 18 }), { nil: undefined }),
            license: fast_check_1.default.option(fast_check_1.default.string({ maxLength: 14 }), { nil: undefined }),
            purpose: fast_check_1.default.oneof(fast_check_1.default.constantFrom(...allowedPurposes), fast_check_1.default
                .string({ maxLength: 24 })
                .filter((candidate) => !allowedPurposes.has(candidate))),
            tenant: fast_check_1.default.string({ minLength: 1, maxLength: 24 }),
        }), async (sample) => {
            const response = await (0, supertest_1.default)(app)
                .get('/v1/models')
                .query({
                local: sample.local === undefined ? undefined : sample.local ? 'true' : 'false',
                modality: sample.modality ?? undefined,
                family: sample.family ?? undefined,
                license: sample.license ?? undefined,
            })
                .set('x-tenant', sample.tenant)
                .set('x-purpose', sample.purpose);
            (0, vitest_1.expect)(response.status).toBeLessThan(500);
            if (!allowedPurposes.has(sample.purpose)) {
                (0, vitest_1.expect)(response.status).toBe(403);
                return;
            }
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('models');
            (0, vitest_1.expect)(JSON.stringify(response.body)).not.toContain('..');
        }), {
            ...propertySettings,
            seed: 987123,
            interruptAfterTimeLimit: 4000,
        });
    });
    (0, vitest_1.it)('rejects traversal-style paths from reaching privileged endpoints', async () => {
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.array(fast_check_1.default.constantFrom('..', 'v1', 'internal', 'metrics'), {
            minLength: 1,
            maxLength: 3,
        }), async (segments) => {
            fast_check_1.default.pre(segments.some((segment) => segment.includes('..')));
            const pathAttempt = `/${segments.join('/')}`;
            const response = await (0, supertest_1.default)(app)
                .post(pathAttempt)
                .set('x-tenant', 'fuzz-tenant')
                .set('x-purpose', 'investigation')
                .send({ objective: 'traversal-probe' });
            (0, vitest_1.expect)(response.status).toBeGreaterThanOrEqual(400);
            (0, vitest_1.expect)(response.status).toBeLessThan(500);
        }), deterministicSettings(424242));
    });
});
