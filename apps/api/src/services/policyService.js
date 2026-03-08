"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpaPolicySimulationService = void 0;
function normalizeObligations(result) {
    if (!result?.obligations || !Array.isArray(result.obligations)) {
        return [];
    }
    return result.obligations.map((obligation, index) => {
        const code = (typeof obligation.code === 'string' && obligation.code) ||
            (typeof obligation.type === 'string' && obligation.type) ||
            `obligation-${index + 1}`;
        const message = typeof obligation.message === 'string'
            ? obligation.message
            : typeof obligation.note === 'string'
                ? obligation.note
                : undefined;
        const targets = Array.isArray(obligation.targets)
            ? obligation.targets.filter((target) => typeof target === 'string')
            : Array.isArray(obligation.fields)
                ? obligation.fields.filter((field) => typeof field === 'string')
                : Array.isArray(obligation.redact)
                    ? obligation.redact.filter((field) => typeof field === 'string')
                    : undefined;
        return {
            code,
            message,
            targets
        };
    });
}
function normalizeRedactions(result, obligations) {
    const redactions = new Set();
    const fromResult = Array.isArray(result?.redactions)
        ? result?.redactions
        : [];
    fromResult.forEach((item) => {
        if (typeof item === 'string') {
            redactions.add(item);
        }
    });
    obligations.forEach((obligation) => {
        if (obligation.code === 'redact' || obligation.code === 'mask') {
            obligation.targets?.forEach((target) => redactions.add(target));
        }
    });
    const annotations = result?.annotations;
    if (annotations && Array.isArray(annotations.redactions)) {
        annotations.redactions
            .filter((value) => typeof value === 'string')
            .forEach((value) => redactions.add(value));
    }
    return [...redactions];
}
class OpaPolicySimulationService {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    get endpoint() {
        return (this.options.endpoint ||
            process.env.OPA_SIMULATION_ENDPOINT ||
            'http://localhost:8181/v1/data/actions/preflight');
    }
    get fetcher() {
        return this.options.fetchImpl || fetch;
    }
    async simulate(input) {
        const response = await this.fetcher(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input,
                simulate: true
            })
        });
        if (!response.ok) {
            throw new Error(`OPA simulation failed with status ${response.status} (${response.statusText})`);
        }
        const payload = (await response.json());
        const result = payload.result || {};
        const obligations = normalizeObligations(payload.result);
        const allow = result.allow ??
            result.allowed ??
            (result.decision ? result.decision === 'allow' : false);
        return {
            allow: Boolean(allow),
            reason: result.reason,
            obligations,
            redactions: normalizeRedactions(payload.result, obligations),
            raw: payload
        };
    }
}
exports.OpaPolicySimulationService = OpaPolicySimulationService;
