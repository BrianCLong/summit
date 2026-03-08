"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const q3cCostGuard_js_1 = require("../q3cCostGuard.js");
(0, globals_1.describe)('q3c middleware', () => {
    const makeResponse = (payload, status = 200) => ({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 403 ? 'Forbidden' : 'OK',
        text: async () => JSON.stringify(payload),
    });
    const baseEnvelope = {
        jobId: 'job-1',
        region: 'us-east-1',
        resources: {
            cpuSeconds: 10,
            ramGbHours: 1,
            ioGb: 0.5,
            egressGb: 0.1,
        },
    };
    (0, globals_1.test)('annotation middleware attaches projected and actual payloads', async () => {
        const fetchMock = globals_1.jest.fn();
        const projected = {
            ...baseEnvelope,
            projected: {
                costUsd: 1,
                carbonKg: 0.1,
                energyKwh: 0.02,
                breakdown: { cpuUsd: 0.2, ramUsd: 0.3, ioUsd: 0.4, egressUsd: 0.1 },
                modelVersion: 'test',
                errorMargin: 0.05,
            },
        };
        const actual = {
            ...projected,
            actual: {
                costUsd: 1.1,
                carbonKg: 0.11,
                energyKwh: 0.021,
                breakdown: projected.projected.breakdown,
                usage: baseEnvelope.resources,
                delta: { costUsd: 0.1, carbonKg: 0.01 },
            },
        };
        fetchMock
            .mockResolvedValueOnce(makeResponse(projected))
            .mockResolvedValueOnce(makeResponse(actual));
        const client = new q3cCostGuard_js_1.Q3CClient({
            baseUrl: 'http://q3c.test',
            fetchImpl: fetchMock,
        });
        const middleware = (0, q3cCostGuard_js_1.createQ3CAnnotationMiddleware)(client);
        const req = {
            body: { ...baseEnvelope, actualResources: baseEnvelope.resources },
        };
        const next = globals_1.jest.fn();
        await middleware(req, {}, next);
        (0, globals_1.expect)(fetchMock).toHaveBeenCalledTimes(2);
        (0, globals_1.expect)(next).toHaveBeenCalled();
        const context = req.q3c;
        (0, globals_1.expect)(context.projected).toEqual(projected);
        (0, globals_1.expect)(context.actual).toEqual(actual);
    });
    (0, globals_1.test)('budget guard denies runs deterministically over budget', async () => {
        const fetchMock = globals_1.jest.fn().mockResolvedValueOnce(makeResponse({
            jobId: 'budget-1',
            region: 'us-east-1',
            budgetUsd: 1,
            projectedUsd: 2,
            projectedCarbonKg: 0.2,
            allowed: false,
            marginUsd: -1,
            modelVersion: 'test',
            errorMargin: 0.05,
        }, 403));
        const client = new q3cCostGuard_js_1.Q3CClient({
            baseUrl: 'http://q3c.test',
            fetchImpl: fetchMock,
        });
        const guard = (0, q3cCostGuard_js_1.createQ3CBudgetGuard)(client, {
            getBudget: () => 1,
        });
        const req = { body: baseEnvelope };
        const res = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn().mockReturnThis(),
        };
        const next = globals_1.jest.fn();
        await guard(req, res, next);
        (0, globals_1.expect)(fetchMock).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
        (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({ error: 'budget_exceeded', jobId: 'job-1' }));
        (0, globals_1.expect)(next).not.toHaveBeenCalled();
    });
});
