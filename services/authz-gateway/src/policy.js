"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = authorize;
const axios_1 = __importDefault(require("axios"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'authz-policy' });
function normalizePath(path) {
    return path.replace(/^\/+/, '');
}
function buildBaseUrl() {
    return (process.env.OPA_BASE_URL || 'http://localhost:8181').replace(/\/+$/, '');
}
function buildEndpoint(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    return `${buildBaseUrl()}/v1/data/${normalizePath(path)}`;
}
function tenantAwarePaths(tenantId) {
    const endpoints = [];
    if (process.env.OPA_URL) {
        endpoints.push(process.env.OPA_URL);
    }
    const tenantTemplate = process.env.OPA_TENANT_POLICY_TEMPLATE;
    if (tenantTemplate && tenantId) {
        const safeTenant = encodeURIComponent(tenantId);
        const normalizedTemplate = tenantTemplate
            .replace('{tenantId}', safeTenant)
            .replace('{tenant}', safeTenant);
        endpoints.push(normalizePath(normalizedTemplate));
    }
    endpoints.push(normalizePath(process.env.OPA_POLICY_PATH || 'summit/abac/decision'));
    return Array.from(new Set(endpoints)).map(buildEndpoint);
}
function normalizeAllow(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const lowered = value.trim().toLowerCase();
        if (lowered === 'true') {
            return true;
        }
        if (lowered === 'false') {
            return false;
        }
    }
    if (typeof value === 'number') {
        if (value === 1) {
            return true;
        }
        if (value === 0) {
            return false;
        }
    }
    return null;
}
function normalizeObligations(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((obligation) => {
        if (typeof obligation !== 'object' || obligation === null) {
            return false;
        }
        const candidate = obligation;
        return typeof candidate.type === 'string' && candidate.type.length > 0;
    });
}
async function authorize(input) {
    const endpoints = tenantAwarePaths(input.subject.tenantId);
    try {
        for (const endpoint of endpoints) {
            try {
                const res = await axios_1.default.post(endpoint, { input });
                const result = res.data?.result;
                if (result === null || result === undefined) {
                    continue;
                }
                if (typeof result === 'boolean') {
                    return {
                        allowed: result,
                        reason: result ? 'allow' : 'deny',
                        obligations: [],
                    };
                }
                const allowed = normalizeAllow(result.allow);
                const reason = result.reason !== undefined && result.reason !== null
                    ? String(result.reason)
                    : allowed === null
                        ? 'deny'
                        : allowed
                            ? 'allow'
                            : 'deny';
                return {
                    allowed: allowed ?? false,
                    reason,
                    obligations: normalizeObligations(result.obligations),
                };
            }
            catch (error) {
                const status = error.response
                    ?.status;
                if (status === 404) {
                    continue;
                }
                if (process.env.NODE_ENV !== 'test') {
                    logger.warn({ err: error, endpoint }, 'OPA evaluation endpoint failed');
                }
            }
        }
        return { allowed: false, reason: 'opa_no_result', obligations: [] };
    }
    catch (error) {
        if (process.env.NODE_ENV !== 'test') {
            logger.error({ err: error }, 'OPA evaluation failed');
        }
        return { allowed: false, reason: 'opa_error', obligations: [] };
    }
}
