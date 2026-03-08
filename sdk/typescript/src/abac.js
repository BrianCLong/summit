"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABACClient = void 0;
function buildHeaders(options) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
    }
    return headers;
}
function withTimeout(promise, timeoutMs) {
    if (!timeoutMs) {
        return promise;
    }
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error('request_timeout')), timeoutMs);
        }),
    ]);
}
class ABACClient {
    baseUrl;
    token;
    timeoutMs;
    fetchImpl;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.token = options.token;
        this.timeoutMs = options.timeoutMs;
        this.fetchImpl = options.fetchImpl || fetch;
    }
    async isAllowed(request) {
        const response = await withTimeout(this.fetchImpl(`${this.baseUrl}/authorize`, {
            method: 'POST',
            headers: buildHeaders({ baseUrl: this.baseUrl, token: this.token }),
            body: JSON.stringify({
                subject: { id: request.subjectId },
                action: request.action,
                resource: request.resourceId
                    ? { id: request.resourceId, ...(request.resource || {}) }
                    : request.resource || {},
                context: request.context,
            }),
        }), this.timeoutMs);
        if (!response.ok) {
            throw new Error(`authorize_failed_${response.status}`);
        }
        const payload = await response.json();
        return {
            allow: Boolean(payload.allow),
            reason: String(payload.reason || (payload.allow ? 'allow' : 'deny')),
            obligations: Array.isArray(payload.obligations) ? payload.obligations : [],
        };
    }
    async getSubjectAttributes(subjectId, options = {}) {
        const url = new URL(`${this.baseUrl}/subject/${subjectId}/attributes`);
        if (options.refresh) {
            url.searchParams.set('refresh', 'true');
        }
        const response = await withTimeout(this.fetchImpl(url.toString(), {
            method: 'GET',
            headers: buildHeaders({ baseUrl: this.baseUrl, token: this.token }),
        }), this.timeoutMs);
        if (!response.ok) {
            throw new Error(`attributes_failed_${response.status}`);
        }
        return response.json();
    }
}
exports.ABACClient = ABACClient;
