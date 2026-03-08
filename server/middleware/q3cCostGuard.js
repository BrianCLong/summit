"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Q3CClient = void 0;
exports.createQ3CAnnotationMiddleware = createQ3CAnnotationMiddleware;
exports.createQ3CBudgetGuard = createQ3CBudgetGuard;
class Q3CClient {
    baseUrl;
    fetchImpl;
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl ??
            process.env.Q3C_URL ??
            'http://localhost:8080').replace(/\/$/, '');
        this.fetchImpl = options.fetchImpl ?? fetch;
    }
    async estimate(envelope) {
        const { payload } = await this.request('/v1/estimate', {
            jobId: envelope.jobId,
            region: envelope.region,
            resources: envelope.resources,
        }, [200]);
        return payload;
    }
    async submitActual(envelope, actual) {
        const { payload } = await this.request('/v1/actual', {
            jobId: envelope.jobId,
            region: envelope.region,
            resources: actual,
        }, [200]);
        return payload;
    }
    async checkBudget(request) {
        const { status, payload } = await this.request('/v1/budget/check', {
            jobId: request.jobId,
            region: request.region,
            resources: request.resources,
            budgetUsd: request.budgetUsd,
        }, [200, 403]);
        if (status === 200) {
            const successPayload = payload;
            return { ...successPayload.budgetCheckResponse, allowed: true };
        }
        const denied = payload;
        return { ...denied, allowed: false };
    }
    async request(path, body, acceptedStatuses) {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const text = await response.text();
        let payload;
        try {
            payload = text ? JSON.parse(text) : {};
        }
        catch (error) {
            if (!acceptedStatuses.includes(response.status)) {
                throw new Error(`q3c request failed (${response.status}): ${text || response.statusText}`);
            }
            throw error;
        }
        if (!acceptedStatuses.includes(response.status)) {
            throw new Error(`q3c request failed (${response.status}): ${text || response.statusText}`);
        }
        return { status: response.status, payload };
    }
}
exports.Q3CClient = Q3CClient;
const defaultExtractor = (req) => {
    const body = req.body;
    if (!body || !body.jobId || !body.region || !body.resources) {
        return null;
    }
    return {
        jobId: body.jobId,
        region: body.region,
        resources: body.resources,
        actualResources: body.actualResources,
    };
};
const defaultAttach = (req, annotation) => {
    req.q3c = annotation;
};
function createQ3CAnnotationMiddleware(client, options = {}) {
    const extractor = options.extractor ?? defaultExtractor;
    const attach = options.attach ?? defaultAttach;
    return async (req, _res, next) => {
        const job = extractor(req);
        if (!job) {
            return next();
        }
        try {
            const projected = await client.estimate(job);
            const annotation = {
                job,
                projected,
            };
            const actualResources = options.actualExtractor?.(req) ?? job.actualResources;
            if (actualResources) {
                annotation.actual = await client.submitActual(job, actualResources);
            }
            attach(req, annotation);
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
function createQ3CBudgetGuard(client, options) {
    const extractor = options.extractor ?? defaultExtractor;
    return async (req, res, next) => {
        const job = extractor(req);
        if (!job) {
            return next();
        }
        const budget = options.getBudget(req);
        if (budget == null || Number.isNaN(budget)) {
            return next();
        }
        try {
            const decision = await client.checkBudget({ ...job, budgetUsd: budget });
            if (!decision.allowed) {
                if (options.onDeny) {
                    options.onDeny(req, res, decision);
                }
                else {
                    res.status(403).json({
                        error: 'budget_exceeded',
                        jobId: decision.jobId,
                        budgetUsd: decision.budgetUsd,
                        projectedUsd: decision.projectedUsd,
                        marginUsd: decision.marginUsd,
                    });
                }
                return;
            }
            const existing = req.q3c;
            if (existing) {
                existing.budgetDecision = decision;
            }
            else {
                req.q3c = {
                    job,
                    projected: await client.estimate(job),
                    budgetDecision: decision,
                };
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
