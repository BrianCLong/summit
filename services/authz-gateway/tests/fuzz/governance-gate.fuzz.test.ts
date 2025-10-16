import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import axios from 'axios';
import express from 'express';
import request from 'supertest';
import fc, { type Arbitrary } from 'fast-check';
import { SignJWT } from 'jose';
import path from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createCoverageMap } from 'istanbul-lib-coverage';
import type { CoverageSummaryData } from 'istanbul-lib-coverage';

import * as policy from '../../src/policy';
import { requireAuth } from '../../src/middleware';
import { initKeys, getPrivateKey } from '../../src/keys';
import type {
  AuthorizationDecision,
  AuthorizationInput,
  DecisionObligation,
  ResourceAttributes,
  SubjectAttributes,
} from '../../src/types';
import type { AttributeService } from '../../src/attribute-service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MAX_REPORT_CASES = 25;
const PROPERTY_RUNS = 60;
const MUTATION_RUNS = 40;
const ADVERSARIAL_CASES = 8;

interface FuzzFinding {
  name: string;
  passed: boolean;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface CoverageFinding {
  file: string;
  summary: CoverageSummaryData;
}

type PolicyResponseSample =
  | { kind: 'ok'; payload: unknown }
  | { kind: 'error'; message: string };

const propertyFindings: FuzzFinding[] = [];
const mutationFindings: FuzzFinding[] = [];
const adversarialFindings: FuzzFinding[] = [];
const coverageSnapshots: CoverageFinding[] = [];

let propertyRuns = 0;
let mutationRuns = 0;

const baseSubject: SubjectAttributes = {
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

const baseResource: ResourceAttributes = {
  id: 'governance-resource',
  tenantId: baseSubject.tenantId,
  residency: baseSubject.residency,
  classification: 'public',
  tags: [],
};

let currentSubject: SubjectAttributes = { ...baseSubject };
let currentResource: ResourceAttributes = { ...baseResource };

const attributeServiceStub = {
  listProtectedActions: () => ['dataset:read'],
  getIdpSchema: () => ({}),
  invalidateSubject: () => undefined,
  invalidateResource: () => undefined,
  getSubjectAttributes: async (subjectId: string) => ({
    ...currentSubject,
    id: subjectId,
  }),
  getResourceAttributes: async (resourceId: string) => ({
    ...currentResource,
    id: resourceId,
  }),
  getDecisionContext: (acr: string) => ({
    protectedActions: ['dataset:read'],
    requestTime: new Date().toISOString(),
    currentAcr: acr,
  }),
} as unknown as AttributeService;

function recordFinding(collection: FuzzFinding[], finding: FuzzFinding) {
  if (collection.length < MAX_REPORT_CASES) {
    collection.push(finding);
  }
}

function resolveAllow(result: unknown): boolean {
  if (typeof result === 'boolean') {
    return result;
  }
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return Boolean((result as { allow?: unknown }).allow);
  }
  return false;
}

function resolveReason(result: unknown): string {
  if (result === null || result === undefined) {
    return 'opa_no_result';
  }
  if (typeof result === 'boolean') {
    return result ? 'allow' : 'deny';
  }
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const typed = result as { allow?: unknown; reason?: unknown };
    if (typed.reason !== undefined && typed.reason !== null) {
      return String(typed.reason);
    }
    return String(typed.allow ? 'allow' : 'deny');
  }
  return 'deny';
}

function resolveObligations(result: unknown): DecisionObligation[] {
  if (
    result &&
    typeof result === 'object' &&
    !Array.isArray(result) &&
    Array.isArray((result as { obligations?: unknown }).obligations)
  ) {
    return (result as { obligations: DecisionObligation[] }).obligations;
  }
  return [];
}

function policyOracle(input: AuthorizationInput): AuthorizationDecision {
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
  if (
    input.resource.classification !== 'public' &&
    input.context.currentAcr !== 'loa2'
  ) {
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

function encodeHeader(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

function createHarnessApp() {
  const app = express();
  app.use(express.json());
  app.get(
    '/governance/test',
    requireAuth(attributeServiceStub, { action: 'dataset:read' }),
    (req, res) => {
      res.json({
        ok: true,
        obligations: (req as any).obligations ?? [],
        subject: (req as any).subjectAttributes,
        resource: (req as any).resourceAttributes,
      });
    },
  );
  return app;
}

async function issueToken(subjectId: string, acr: string) {
  return new SignJWT({ sub: subjectId, acr })
    .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(getPrivateKey());
}

describe('governance gate fuzzing', () => {
  beforeAll(async () => {
    await initKeys();
  });

  afterEach(() => {
    mockedAxios.post.mockReset();
  });

  afterAll(() => {
    const coverage = (globalThis as any).__coverage__;
    expect(coverage).toBeDefined();
    if (!coverage) {
      return;
    }

    const map = createCoverageMap(coverage);
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
        .data as CoverageSummaryData;
      coverageSnapshots.push({ file, summary });
      expect(summary.statements.pct).toBeGreaterThan(0);
      expect(summary.branches.pct).toBeGreaterThan(0);
    }

    const reportDir = path.resolve(__dirname, '../reports');
    mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'governance-gate-fuzz-report.json');
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
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
  });

  it('performs property-based fuzzing on OPA responses', async () => {
    const subjectArb = fc.record({
      id: fc.string({ minLength: 1, maxLength: 24 }),
      tenantId: fc.string({ minLength: 1, maxLength: 16 }),
      roles: fc.array(fc.string({ minLength: 1, maxLength: 16 }), {
        maxLength: 5,
      }),
      entitlements: fc.array(fc.string({ minLength: 1, maxLength: 16 }), {
        maxLength: 5,
      }),
      residency: fc.string({ minLength: 2, maxLength: 8 }),
      clearance: fc.string({ minLength: 3, maxLength: 12 }),
      loa: fc.constantFrom('loa1', 'loa2', 'loa3'),
      riskScore: fc.integer({ min: 0, max: 100 }),
      groups: fc.array(fc.string({ minLength: 1, maxLength: 16 }), {
        maxLength: 5,
      }),
      metadata: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 12 }),
        fc.string({ minLength: 0, maxLength: 24 }),
        { maxKeys: 4 },
      ),
      lastSyncedAt: fc.option(
        fc.date().map((d) => d.toISOString()),
        { nil: undefined },
      ),
      lastReviewedAt: fc.option(
        fc.date().map((d) => d.toISOString()),
        {
          nil: undefined,
        },
      ),
    });

    const resourceArb = fc.record({
      id: fc.string({ minLength: 1, maxLength: 24 }),
      tenantId: fc.string({ minLength: 1, maxLength: 16 }),
      residency: fc.string({ minLength: 2, maxLength: 8 }),
      classification: fc.string({ minLength: 3, maxLength: 12 }),
      tags: fc.array(fc.string({ minLength: 1, maxLength: 16 }), {
        maxLength: 5,
      }),
    });

    const decisionContextArb = fc.record({
      protectedActions: fc.array(fc.string({ minLength: 3, maxLength: 24 }), {
        maxLength: 6,
      }),
      requestTime: fc.date().map((d) => d.toISOString()),
      currentAcr: fc.constantFrom('loa1', 'loa2', 'loa3'),
    });

    const opaResultArb = fc.oneof(
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.jsonValue(),
      fc.record(
        {
          allow: fc.oneof(fc.boolean(), fc.string(), fc.integer()),
          reason: fc.option(fc.string({ minLength: 0, maxLength: 32 }), {
            nil: undefined,
          }),
          obligations: fc.option(
            fc.oneof(
              fc.array(
                fc.record(
                  {
                    type: fc.string({ minLength: 1, maxLength: 16 }),
                    mechanism: fc.option(
                      fc.string({ minLength: 1, maxLength: 16 }),
                      {
                        nil: undefined,
                      },
                    ),
                    required_acr: fc.option(
                      fc.string({ minLength: 3, maxLength: 12 }),
                      { nil: undefined },
                    ),
                  },
                  { withDeletedKeys: true },
                ),
                { maxLength: 4 },
              ),
              fc.jsonValue(),
            ),
            { nil: undefined },
          ),
        },
        { withDeletedKeys: true },
      ),
    );

    const policyResponseArb: Arbitrary<PolicyResponseSample> = fc.oneof(
      fc.record({
        kind: fc.constantFrom<'ok'>('ok'),
        payload: opaResultArb,
      }),
      fc.record({
        kind: fc.constantFrom<'error'>('error'),
        message: fc.string({ maxLength: 48 }),
      }),
    ) as Arbitrary<PolicyResponseSample>;

    await fc.assert(
      fc.asyncProperty(
        subjectArb,
        resourceArb,
        fc.string({ minLength: 3, maxLength: 24 }),
        decisionContextArb,
        policyResponseArb,
        async (subject, resource, action, context, response) => {
          propertyRuns += 1;
          const input: AuthorizationInput = {
            subject,
            resource,
            action,
            context,
          };

          if (response.kind === 'ok') {
            mockedAxios.post.mockResolvedValueOnce({
              data: { result: response.payload },
            });
          } else {
            mockedAxios.post.mockRejectedValueOnce(new Error(response.message));
          }

          const decision = await policy.authorize(input);
          expect(typeof decision.allowed).toBe('boolean');
          expect(typeof decision.reason).toBe('string');
          expect(Array.isArray(decision.obligations)).toBe(true);

          if (response.kind === 'ok') {
            const expectedAllow = resolveAllow(response.payload);
            const expectedReason = resolveReason(response.payload);
            const expectedObligations = resolveObligations(response.payload);
            expect(decision.allowed).toBe(expectedAllow);
            expect(decision.reason).toBe(expectedReason);
            if (expectedObligations.length > 0) {
              expect(decision.obligations).toEqual(expectedObligations);
            } else {
              expect(decision.obligations.length).toBe(0);
            }
          } else {
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toBe('opa_error');
            expect(decision.obligations.length).toBe(0);
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
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('enforces governance boundaries under mutation-based fuzzing', async () => {
    const authorizeSpy = jest
      .spyOn(policy, 'authorize')
      .mockImplementation(async (input) => policyOracle(input));

    const mutationArb = fc.record({
      tenantId: fc.option(fc.string({ minLength: 1, maxLength: 16 }), {
        nil: undefined,
      }),
      residency: fc.option(fc.constantFrom('us', 'eu', 'apac', 'latam'), {
        nil: undefined,
      }),
      classification: fc.option(
        fc.constantFrom('public', 'internal', 'restricted'),
        {
          nil: undefined,
        },
      ),
      tags: fc.array(fc.constantFrom('admin-only', 'sensitive', 'pii'), {
        maxLength: 2,
      }),
      degradeAcr: fc.boolean(),
      tamperToken: fc.boolean(),
      riskScore: fc.option(fc.integer({ min: 0, max: 100 }), {
        nil: undefined,
      }),
    });

    await fc.assert(
      fc.asyncProperty(mutationArb, async (mutation) => {
        mutationRuns += 1;
        currentSubject = {
          ...baseSubject,
          riskScore: mutation.riskScore ?? baseSubject.riskScore,
        };
        currentResource = { ...baseResource };

        const tenantHeader = mutation.tenantId ?? baseSubject.tenantId;
        const residencyHeader = mutation.residency ?? baseResource.residency;
        const classificationHeader =
          mutation.classification ?? baseResource.classification;
        const tags =
          mutation.tags.length > 0 ? Array.from(new Set(mutation.tags)) : [];

        const acr = mutation.degradeAcr ? 'loa1' : 'loa2';
        let token = await issueToken(currentSubject.id, acr);
        const app = createHarnessApp();
        const previousCalls = authorizeSpy.mock.calls.length;

        if (mutation.tamperToken) {
          token = `${token.slice(0, Math.max(0, token.length - 2))}xx`;
        }

        const response = await request(app)
          .get('/governance/test')
          .set('Authorization', `Bearer ${token}`)
          .set('x-tenant-id', tenantHeader)
          .set('x-resource-residency', residencyHeader)
          .set('x-resource-classification', classificationHeader)
          .set('x-resource-tags', tags.join(','));

        if (mutation.tamperToken) {
          expect(response.status).toBe(401);
          expect(response.body.error).toBe('invalid_token');
          expect(authorizeSpy.mock.calls.length).toBe(previousCalls);
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

        expect(authorizeSpy.mock.calls.length).toBe(previousCalls + 1);

        const simulatedInput: AuthorizationInput = {
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

        expect(response.status).toBe(expectedStatus);
        if (expectedDecision.allowed) {
          expect(response.body.ok).toBe(true);
        } else if (expectedDecision.reason === 'step_up_required') {
          expect(response.body.error).toBe('step_up_required');
          expect(response.body.obligations).toEqual(
            expectedDecision.obligations,
          );
        } else {
          expect(response.body.error).toBe('forbidden');
          expect(response.body.reason).toBe(expectedDecision.reason);
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
      }),
      { numRuns: MUTATION_RUNS },
    );

    authorizeSpy.mockRestore();
  });

  it('guards against adversarial governance inputs', async () => {
    const authorizeSpy = jest
      .spyOn(policy, 'authorize')
      .mockImplementation(async (input) => policyOracle(input));
    const app = createHarnessApp();

    const adversarialStringArb = fc.oneof(
      fc.constant("tenantA'; DROP TABLE audit_log;--"),
      fc.constant('<script>alert(1)</script>'),
      fc.fullUnicodeString({ minLength: 4, maxLength: 32 }),
      fc.base64String({ minLength: 16, maxLength: 48 }),
      fc.hexaString({ minLength: 8, maxLength: 32 }),
    );

    const adversarialArb = fc.record({
      tenantId: adversarialStringArb,
      residency: fc.constantFrom('us', 'eu', 'apac', 'latam'),
      classification: adversarialStringArb,
      tags: fc.array(adversarialStringArb, { minLength: 1, maxLength: 2 }),
      degradeAcr: fc.boolean(),
    });

    const samples = fc.sample(adversarialArb, ADVERSARIAL_CASES);
    for (const sample of samples) {
      currentSubject = { ...baseSubject };
      currentResource = { ...baseResource };
      const acr = sample.degradeAcr ? 'loa1' : 'loa2';
      const token = await issueToken(currentSubject.id, acr);

      const encodedTenant = encodeHeader(sample.tenantId);
      const encodedClassification = encodeHeader(sample.classification);
      const encodedTags = sample.tags.map((tag) => encodeHeader(tag));

      const response = await request(app)
        .get('/governance/test')
        .set('Authorization', `Bearer ${token}`)
        .set('x-tenant-id', encodedTenant)
        .set('x-resource-residency', sample.residency)
        .set('x-resource-classification', encodedClassification)
        .set('x-resource-tags', encodedTags.join(','));

      expect([200, 401, 403]).toContain(response.status);
      if (response.status === 401) {
        expect(
          response.body.error === 'invalid_token' ||
            response.body.error === 'step_up_required',
        ).toBe(true);
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
