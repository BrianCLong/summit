"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const axios_1 = __importDefault(require("axios"));
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const fast_check_1 = __importDefault(require("fast-check"));
const jose_1 = require("jose");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const istanbul_lib_coverage_1 = require("istanbul-lib-coverage");
const policy = __importStar(require("../../src/policy"));
const middleware_1 = require("../../src/middleware");
const keys_1 = require("../../src/keys");
globals_1.jest.mock('axios');
const mockedAxios = axios_1.default;
const MAX_REPORT_CASES = 25;
const PROPERTY_RUNS = 60;
const MUTATION_RUNS = 40;
const ADVERSARIAL_CASES = 8;
const propertyFindings = [];
const mutationFindings = [];
const adversarialFindings = [];
const coverageSnapshots = [];
let propertyRuns = 0;
let mutationRuns = 0;
const baseSubject = {
    id: 'user-alice',
    tenantId: 'tenantA',
    roles: ['analyst'],
    entitlements: ['dataset:read'],
    residency: 'us',
    clearance: 'public',
    loa: 'loa2',
    riskScore: 12,
    groups: ['analytics'],
    metadata: {
        email: 'alice@example.com',
        manager: 'managerA',
    },
    lastSyncedAt: new Date(1700000000000).toISOString(),
    lastReviewedAt: new Date(1700000000000).toISOString(),
};
const baseResource = {
    id: 'governance-resource',
    tenantId: baseSubject.tenantId,
    residency: baseSubject.residency,
    classification: 'public',
    tags: [],
};
let currentSubject = { ...baseSubject };
let currentResource = { ...baseResource };
const attributeServiceStub = {
    listProtectedActions: () => ['dataset:read'],
    getIdpSchema: () => ({}),
    invalidateSubject: () => undefined,
    invalidateResource: () => undefined,
    getSubjectAttributes: async (subjectId) => ({
        ...currentSubject,
        id: subjectId,
    }),
    getResourceAttributes: async (resourceId) => ({
        ...currentResource,
        id: resourceId,
    }),
    getDecisionContext: (acr) => ({
        protectedActions: ['dataset:read'],
        requestTime: new Date().toISOString(),
        currentAcr: acr,
    }),
};
function recordFinding(collection, finding) {
    if (collection.length < MAX_REPORT_CASES) {
        collection.push(finding);
    }
}
function resolveAllow(result) {
    if (typeof result === 'boolean') {
        return result;
    }
    if (result && typeof result === 'object' && !Array.isArray(result)) {
        return Boolean(result.allow);
    }
    return false;
}
function resolveReason(result) {
    if (result === null || result === undefined) {
        return 'opa_no_result';
    }
    if (typeof result === 'boolean') {
        return result ? 'allow' : 'deny';
    }
    if (result && typeof result === 'object' && !Array.isArray(result)) {
        const typed = result;
        if (typed.reason !== undefined && typed.reason !== null) {
            return String(typed.reason);
        }
        return String(typed.allow ? 'allow' : 'deny');
    }
    return 'deny';
}
function resolveObligations(result) {
    if (result &&
        typeof result === 'object' &&
        !Array.isArray(result) &&
        Array.isArray(result.obligations)) {
        return result.obligations;
    }
    return [];
}
function policyOracle(input) {
    if (input.subject.tenantId !== input.resource.tenantId) {
        return { allowed: false, reason: 'tenant_mismatch', obligations: [] };
    }
    if (input.subject.residency !== input.resource.residency) {
        return { allowed: false, reason: 'residency_mismatch', obligations: [] };
    }
    if (input.resource.tags.includes('admin-only')) {
        return {
            allowed: false,
            reason: 'least_privilege_violation',
            obligations: [],
        };
    }
    if (input.resource.classification !== 'public' &&
        input.context.currentAcr !== 'loa2') {
        return {
            allowed: false,
            reason: 'step_up_required',
            obligations: [
                { type: 'step_up', mechanism: 'webauthn', required_acr: 'loa2' },
            ],
        };
    }
    if (input.subject.riskScore > 80) {
        return {
            allowed: false,
            reason: 'risk_threshold_exceeded',
            obligations: [],
        };
    }
    return { allowed: true, reason: 'allow', obligations: [] };
}
function encodeHeader(value) {
    return Buffer.from(value, 'utf8').toString('base64');
}
function createHarnessApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.get('/governance/test', (0, middleware_1.requireAuth)(attributeServiceStub, { action: 'dataset:read' }), (req, res) => {
        const { obligations = [], subjectAttributes, resourceAttributes } = req;
        res.json({
            ok: true,
            obligations,
            subject: subjectAttributes,
            resource: resourceAttributes,
        });
    });
    return app;
}
async function issueToken(subjectId, acr) {
    return new jose_1.SignJWT({ sub: subjectId, acr })
        .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign((0, keys_1.getPrivateKey)());
}
(0, globals_1.describe)('governance gate fuzzing', () => {
    (0, globals_1.beforeAll)(async () => {
        await (0, keys_1.initKeys)();
    });
    (0, globals_1.afterEach)(() => {
        mockedAxios.post.mockReset();
    });
    (0, globals_1.afterAll)(() => {
        const coverage = globalThis.__coverage__;
        (0, globals_1.expect)(coverage).toBeDefined();
        if (!coverage) {
            return;
        }
        const map = (0, istanbul_lib_coverage_1.createCoverageMap)(coverage);
        const targetFiles = [
            'services/authz-gateway/src/middleware.ts',
            'services/authz-gateway/src/policy.ts',
        ];
        for (const file of targetFiles) {
            const match = map.files().find((candidate) => candidate.endsWith(file));
            if (!match) {
                continue;
            }
            const summary = map.fileCoverageFor(match).toSummary()
                .data;
            coverageSnapshots.push({ file, summary });
            (0, globals_1.expect)(summary.statements.pct).toBeGreaterThan(0);
            (0, globals_1.expect)(summary.branches.pct).toBeGreaterThan(0);
        }
        const reportDir = path_1.default.resolve(__dirname, '../reports');
        (0, fs_1.mkdirSync)(reportDir, { recursive: true });
        const reportPath = path_1.default.join(reportDir, 'governance-gate-fuzz-report.json');
        const report = {
            generatedAt: new Date().toISOString(),
            propertyBased: {
                runs: propertyRuns,
                samples: propertyFindings,
            },
            mutationFuzzing: {
                runs: mutationRuns,
                samples: mutationFindings,
            },
            adversarialFuzzing: {
                cases: adversarialFindings.length,
                samples: adversarialFindings,
            },
            coverage: coverageSnapshots,
        };
        (0, fs_1.writeFileSync)(reportPath, JSON.stringify(report, null, 2));
    });
    (0, globals_1.it)('performs property-based fuzzing on OPA responses', async () => {
        const subjectArb = fast_check_1.default.record({
            id: fast_check_1.default.string({ minLength: 1, maxLength: 24 }),
            tenantId: fast_check_1.default.string({ minLength: 1, maxLength: 16 }),
            roles: fast_check_1.default.array(fast_check_1.default.string({ minLength: 1, maxLength: 16 }), {
                maxLength: 5,
            }),
            entitlements: fast_check_1.default.array(fast_check_1.default.string({ minLength: 1, maxLength: 16 }), {
                maxLength: 5,
            }),
            residency: fast_check_1.default.string({ minLength: 2, maxLength: 8 }),
            clearance: fast_check_1.default.string({ minLength: 3, maxLength: 12 }),
            loa: fast_check_1.default.constantFrom('loa1', 'loa2', 'loa3'),
            riskScore: fast_check_1.default.integer({ min: 0, max: 100 }),
            groups: fast_check_1.default.array(fast_check_1.default.string({ minLength: 1, maxLength: 16 }), {
                maxLength: 5,
            }),
            metadata: fast_check_1.default.dictionary(fast_check_1.default.string({ minLength: 1, maxLength: 12 }), fast_check_1.default.string({ minLength: 0, maxLength: 24 }), { maxKeys: 4 }),
            lastSyncedAt: fast_check_1.default.option(fast_check_1.default.date().map((d) => d.toISOString()), { nil: undefined }),
            lastReviewedAt: fast_check_1.default.option(fast_check_1.default.date().map((d) => d.toISOString()), {
                nil: undefined,
            }),
        });
        const resourceArb = fast_check_1.default.record({
            id: fast_check_1.default.string({ minLength: 1, maxLength: 24 }),
            tenantId: fast_check_1.default.string({ minLength: 1, maxLength: 16 }),
            residency: fast_check_1.default.string({ minLength: 2, maxLength: 8 }),
            classification: fast_check_1.default.string({ minLength: 3, maxLength: 12 }),
            tags: fast_check_1.default.array(fast_check_1.default.string({ minLength: 1, maxLength: 16 }), {
                maxLength: 5,
            }),
        });
        const decisionContextArb = fast_check_1.default.record({
            protectedActions: fast_check_1.default.array(fast_check_1.default.string({ minLength: 3, maxLength: 24 }), {
                maxLength: 6,
            }),
            requestTime: fast_check_1.default.date().map((d) => d.toISOString()),
            currentAcr: fast_check_1.default.constantFrom('loa1', 'loa2', 'loa3'),
        });
        const opaResultArb = fast_check_1.default.oneof(fast_check_1.default.boolean(), fast_check_1.default.constant(null), fast_check_1.default.constant(undefined), fast_check_1.default.jsonValue(), fast_check_1.default.record({
            allow: fast_check_1.default.oneof(fast_check_1.default.boolean(), fast_check_1.default.string(), fast_check_1.default.integer()),
            reason: fast_check_1.default.option(fast_check_1.default.string({ minLength: 0, maxLength: 32 }), {
                nil: undefined,
            }),
            obligations: fast_check_1.default.option(fast_check_1.default.oneof(fast_check_1.default.array(fast_check_1.default.record({
                type: fast_check_1.default.string({ minLength: 1, maxLength: 16 }),
                mechanism: fast_check_1.default.option(fast_check_1.default.string({ minLength: 1, maxLength: 16 }), {
                    nil: undefined,
                }),
                required_acr: fast_check_1.default.option(fast_check_1.default.string({ minLength: 3, maxLength: 12 }), { nil: undefined }),
            }, { withDeletedKeys: true }), { maxLength: 4 }), fast_check_1.default.jsonValue()), { nil: undefined }),
        }, { withDeletedKeys: true }));
        const policyResponseArb = fast_check_1.default.oneof(fast_check_1.default.record({
            kind: fast_check_1.default.constantFrom('ok'),
            payload: opaResultArb,
        }), fast_check_1.default.record({
            kind: fast_check_1.default.constantFrom('error'),
            message: fast_check_1.default.string({ maxLength: 48 }),
        }));
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(subjectArb, resourceArb, fast_check_1.default.string({ minLength: 3, maxLength: 24 }), decisionContextArb, policyResponseArb, async (subject, resource, action, context, response) => {
            propertyRuns += 1;
            const input = {
                subject,
                resource,
                action,
                context,
            };
            if (response.kind === 'ok') {
                mockedAxios.post.mockResolvedValueOnce({
                    data: { result: response.payload },
                });
            }
            else {
                mockedAxios.post.mockRejectedValueOnce(new Error(response.message));
            }
            const decision = await policy.authorize(input);
            (0, globals_1.expect)(typeof decision.allowed).toBe('boolean');
            (0, globals_1.expect)(typeof decision.reason).toBe('string');
            (0, globals_1.expect)(Array.isArray(decision.obligations)).toBe(true);
            if (response.kind === 'ok') {
                const expectedAllow = resolveAllow(response.payload);
                const expectedReason = resolveReason(response.payload);
                const expectedObligations = resolveObligations(response.payload);
                (0, globals_1.expect)(decision.allowed).toBe(expectedAllow);
                (0, globals_1.expect)(decision.reason).toBe(expectedReason);
                if (expectedObligations.length > 0) {
                    (0, globals_1.expect)(decision.obligations).toEqual(expectedObligations);
                }
                else {
                    (0, globals_1.expect)(decision.obligations.length).toBe(0);
                }
            }
            else {
                (0, globals_1.expect)(decision.allowed).toBe(false);
                (0, globals_1.expect)(decision.reason).toBe('opa_error');
                (0, globals_1.expect)(decision.obligations.length).toBe(0);
            }
            recordFinding(propertyFindings, {
                name: 'policy-authorize',
                passed: true,
                input: {
                    tenant: subject.tenantId,
                    resourceTenant: resource.tenantId,
                    action,
                    responseKind: response.kind,
                },
                result: {
                    allowed: decision.allowed,
                    reason: decision.reason,
                    obligations: decision.obligations.length,
                },
            });
            mockedAxios.post.mockReset();
        }), { numRuns: PROPERTY_RUNS });
    });
    (0, globals_1.it)('enforces governance boundaries under mutation-based fuzzing', async () => {
        const authorizeSpy = globals_1.jest
            .spyOn(policy, 'authorize')
            .mockImplementation(async (input) => policyOracle(input));
        const mutationArb = fast_check_1.default.record({
            tenantId: fast_check_1.default.option(fast_check_1.default.string({ minLength: 1, maxLength: 16 }), {
                nil: undefined,
            }),
            residency: fast_check_1.default.option(fast_check_1.default.constantFrom('us', 'eu', 'apac', 'latam'), {
                nil: undefined,
            }),
            classification: fast_check_1.default.option(fast_check_1.default.constantFrom('public', 'internal', 'restricted'), {
                nil: undefined,
            }),
            tags: fast_check_1.default.array(fast_check_1.default.constantFrom('admin-only', 'sensitive', 'pii'), {
                maxLength: 2,
            }),
            degradeAcr: fast_check_1.default.boolean(),
            tamperToken: fast_check_1.default.boolean(),
            riskScore: fast_check_1.default.option(fast_check_1.default.integer({ min: 0, max: 100 }), {
                nil: undefined,
            }),
        });
        await fast_check_1.default.assert(fast_check_1.default.asyncProperty(mutationArb, async (mutation) => {
            mutationRuns += 1;
            currentSubject = {
                ...baseSubject,
                riskScore: mutation.riskScore ?? baseSubject.riskScore,
            };
            currentResource = { ...baseResource };
            const tenantHeader = mutation.tenantId ?? baseSubject.tenantId;
            const residencyHeader = mutation.residency ?? baseResource.residency;
            const classificationHeader = mutation.classification ?? baseResource.classification;
            const tags = mutation.tags.length > 0 ? Array.from(new Set(mutation.tags)) : [];
            const acr = mutation.degradeAcr ? 'loa1' : 'loa2';
            let token = await issueToken(currentSubject.id, acr);
            const app = createHarnessApp();
            const previousCalls = authorizeSpy.mock.calls.length;
            if (mutation.tamperToken) {
                token = `${token.slice(0, Math.max(0, token.length - 2))}xx`;
            }
            const response = await (0, supertest_1.default)(app)
                .get('/governance/test')
                .set('Authorization', `Bearer ${token}`)
                .set('x-tenant-id', tenantHeader)
                .set('x-resource-residency', residencyHeader)
                .set('x-resource-classification', classificationHeader)
                .set('x-resource-tags', tags.join(','));
            if (mutation.tamperToken) {
                (0, globals_1.expect)(response.status).toBe(401);
                (0, globals_1.expect)(response.body.error).toBe('invalid_token');
                (0, globals_1.expect)(authorizeSpy.mock.calls.length).toBe(previousCalls);
                recordFinding(mutationFindings, {
                    name: 'mutation-invalid-token',
                    passed: true,
                    input: {
                        tamperToken: mutation.tamperToken,
                        acr,
                    },
                    result: {
                        status: response.status,
                        error: response.body.error,
                    },
                });
                return;
            }
            (0, globals_1.expect)(authorizeSpy.mock.calls.length).toBe(previousCalls + 1);
            const simulatedInput = {
                subject: { ...currentSubject },
                resource: {
                    id: '/governance/test',
                    tenantId: tenantHeader,
                    residency: residencyHeader,
                    classification: classificationHeader,
                    tags,
                },
                action: 'dataset:read',
                context: {
                    protectedActions: ['dataset:read'],
                    requestTime: new Date().toISOString(),
                    currentAcr: acr,
                },
            };
            const expectedDecision = policyOracle(simulatedInput);
            const expectedStatus = expectedDecision.allowed
                ? 200
                : expectedDecision.reason === 'step_up_required'
                    ? 401
                    : 403;
            (0, globals_1.expect)(response.status).toBe(expectedStatus);
            if (expectedDecision.allowed) {
                (0, globals_1.expect)(response.body.ok).toBe(true);
            }
            else if (expectedDecision.reason === 'step_up_required') {
                (0, globals_1.expect)(response.body.error).toBe('step_up_required');
                (0, globals_1.expect)(response.body.obligations).toEqual(expectedDecision.obligations);
            }
            else {
                (0, globals_1.expect)(response.body.error).toBe('forbidden');
                (0, globals_1.expect)(response.body.reason).toBe(expectedDecision.reason);
            }
            recordFinding(mutationFindings, {
                name: 'mutation-governance-case',
                passed: true,
                input: {
                    tenantHeader,
                    residencyHeader,
                    classificationHeader,
                    tags,
                    acr,
                    riskScore: currentSubject.riskScore,
                },
                result: {
                    status: response.status,
                    reason: expectedDecision.reason,
                    obligations: expectedDecision.obligations.length,
                },
            });
        }), { numRuns: MUTATION_RUNS });
        authorizeSpy.mockRestore();
    });
    (0, globals_1.it)('guards against adversarial governance inputs', async () => {
        const authorizeSpy = globals_1.jest
            .spyOn(policy, 'authorize')
            .mockImplementation(async (input) => policyOracle(input));
        const app = createHarnessApp();
        const adversarialStringArb = fast_check_1.default.oneof(fast_check_1.default.constant("tenantA'; DROP TABLE audit_log;--"), fast_check_1.default.constant('<script>alert(1)</script>'), fast_check_1.default.fullUnicodeString({ minLength: 4, maxLength: 32 }), fast_check_1.default.base64String({ minLength: 16, maxLength: 48 }), fast_check_1.default.hexaString({ minLength: 8, maxLength: 32 }));
        const adversarialArb = fast_check_1.default.record({
            tenantId: adversarialStringArb,
            residency: fast_check_1.default.constantFrom('us', 'eu', 'apac', 'latam'),
            classification: adversarialStringArb,
            tags: fast_check_1.default.array(adversarialStringArb, { minLength: 1, maxLength: 2 }),
            degradeAcr: fast_check_1.default.boolean(),
        });
        const samples = fast_check_1.default.sample(adversarialArb, ADVERSARIAL_CASES);
        for (const sample of samples) {
            currentSubject = { ...baseSubject };
            currentResource = { ...baseResource };
            const acr = sample.degradeAcr ? 'loa1' : 'loa2';
            const token = await issueToken(currentSubject.id, acr);
            const encodedTenant = encodeHeader(sample.tenantId);
            const encodedClassification = encodeHeader(sample.classification);
            const encodedTags = sample.tags.map((tag) => encodeHeader(tag));
            const response = await (0, supertest_1.default)(app)
                .get('/governance/test')
                .set('Authorization', `Bearer ${token}`)
                .set('x-tenant-id', encodedTenant)
                .set('x-resource-residency', sample.residency)
                .set('x-resource-classification', encodedClassification)
                .set('x-resource-tags', encodedTags.join(','));
            (0, globals_1.expect)([200, 401, 403]).toContain(response.status);
            if (response.status === 401) {
                (0, globals_1.expect)(response.body.error === 'invalid_token' ||
                    response.body.error === 'step_up_required').toBe(true);
            }
            recordFinding(adversarialFindings, {
                name: 'adversarial-input',
                passed: true,
                input: {
                    tenantId: sample.tenantId,
                    classification: sample.classification,
                    tags: sample.tags,
                    encodedTenant,
                    encodedClassification,
                    encodedTags,
                    acr,
                },
                result: {
                    status: response.status,
                    error: response.body.error,
                    reason: response.body.reason,
                },
            });
        }
        authorizeSpy.mockRestore();
    });
});
