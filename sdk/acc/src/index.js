"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCClient = void 0;
exports.withPolicyTags = withPolicyTags;
exports.explainSummary = explainSummary;
const undici_1 = require("undici");
const JSON_HEADERS = {
    'content-type': 'application/json',
    accept: 'application/json'
};
class ACCClient {
    baseUrl;
    fetchImpl;
    defaultHeaders;
    constructor(options) {
        if (!options?.baseUrl) {
            throw new Error('ACCClient requires a baseUrl');
        }
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.fetchImpl = options.fetchImpl ?? (globalThis.fetch ?? undici_1.fetch);
        this.defaultHeaders = { ...JSON_HEADERS, ...(options.defaultHeaders ?? {}) };
    }
    async plan(request, options = {}) {
        const response = await this.fetchImpl(`${this.baseUrl}/plan`, {
            method: 'POST',
            body: JSON.stringify(request),
            headers: { ...this.defaultHeaders, ...(options.headers ?? {}) },
            signal: options.signal
        });
        if (!response.ok) {
            const message = await safeText(response);
            throw new Error(`ACC plan failed (${response.status}): ${message}`);
        }
        return (await response.json());
    }
    async updateReplicaMetrics(update, options = {}) {
        const response = await this.fetchImpl(`${this.baseUrl}/replica`, {
            method: 'POST',
            body: JSON.stringify(update),
            headers: { ...this.defaultHeaders, ...(options.headers ?? {}) },
            signal: options.signal
        });
        if (!response.ok) {
            const message = await safeText(response);
            throw new Error(`ACC replica update failed (${response.status}): ${message}`);
        }
    }
    formatExplain(plan) {
        return plan.explain
            .map((step, idx) => {
            const meta = step.meta ? ` ${JSON.stringify(step.meta)}` : '';
            return `${idx + 1}. [${step.stage}] ${step.message}${meta}`;
        })
            .join('\n');
    }
}
exports.ACCClient = ACCClient;
async function safeText(response) {
    try {
        return await response.text();
    }
    catch (err) {
        return err.message;
    }
}
function withPolicyTags(request, tags) {
    return {
        ...request,
        'x-acc-data-class': tags.dataClass,
        'x-acc-purpose': tags.purpose,
        'x-acc-jurisdiction': tags.jurisdiction
    };
}
function explainSummary(plan) {
    const steps = plan.explain.map((step) => step.stage);
    return `${plan.mode} via ${steps.join(' -> ')}`;
}
