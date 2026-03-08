"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ActionPolicyService_js_1 = require("../ActionPolicyService.js");
const baseRequest = {
    action: 'DELETE_ACCOUNT',
    actor: { id: 'user-1', tenantId: 't-1', role: 'admin' },
    resource: { id: 'acc-1', type: 'account' },
    context: { currentAcr: 'loa2' },
};
const buildService = (result) => {
    const store = {
        saved: null,
        saveDecision: globals_1.jest.fn(async (_preflightId, requestHash, decision) => {
            store.saved = {
                decision,
                requestHash,
                policyName: decision.policyVersion || 'actions',
            };
        }),
        getDecision: globals_1.jest.fn(async () => store.saved),
    };
    const service = new ActionPolicyService_js_1.ActionPolicyService({ store });
    service.http = {
        post: globals_1.jest.fn().mockResolvedValue({ data: { result } }),
    };
    return { service, store };
};
(0, globals_1.describe)('ActionPolicyService', () => {
    (0, globals_1.it)('runs preflight and validates execution when hashes match', async () => {
        const { service } = buildService({ allow: true, obligations: [] });
        const preflight = await service.preflight(baseRequest, {
            correlationId: 'corr-1',
        });
        (0, globals_1.expect)(preflight.decision.allow).toBe(true);
        (0, globals_1.expect)(preflight.requestHash).toBeDefined();
        const execution = await service.validateExecution(preflight.preflightId, baseRequest);
        (0, globals_1.expect)(execution.status).toBe('ok');
    });
    (0, globals_1.it)('blocks execution when preflight denied', async () => {
        const { service } = buildService({ allow: false, reason: 'deny' });
        const preflight = await service.preflight(baseRequest);
        const execution = await service.validateExecution(preflight.preflightId, baseRequest);
        (0, globals_1.expect)(execution.status).toBe('blocked');
    });
    (0, globals_1.it)('blocks execution when obligations are unsatisfied', async () => {
        const { service } = buildService({
            allow: true,
            obligations: [{ code: 'DUAL_CONTROL', satisfied: false }],
        });
        const preflight = await service.preflight(baseRequest);
        const execution = await service.validateExecution(preflight.preflightId, baseRequest);
        (0, globals_1.expect)(execution.status).toBe('blocked');
    });
    (0, globals_1.it)('flags execution when request hash differs from preflight', async () => {
        const { service } = buildService({ allow: true, obligations: [] });
        const preflight = await service.preflight(baseRequest);
        const changedRequest = {
            ...baseRequest,
            resource: { ...baseRequest.resource, id: 'other' },
        };
        const execution = await service.validateExecution(preflight.preflightId, changedRequest);
        (0, globals_1.expect)(execution.status).toBe('hash_mismatch');
    });
    (0, globals_1.it)('expires preflight decisions when TTL has passed', async () => {
        const { service, store } = buildService({ allow: true, obligations: [] });
        const preflight = await service.preflight(baseRequest);
        store.saved.decision.expiresAt = new Date(Date.now() - 1000).toISOString();
        const execution = await service.validateExecution(preflight.preflightId, baseRequest);
        (0, globals_1.expect)(execution.status).toBe('expired');
    });
});
