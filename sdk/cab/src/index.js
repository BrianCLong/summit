"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CABClient = void 0;
class CABClient {
    baseUrl;
    fetchImpl;
    defaultHeaders;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl ?? 'http://localhost:8085';
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.defaultHeaders = options.defaultHeaders ?? { 'Content-Type': 'application/json' };
    }
    async evaluate(request) {
        return this.post('/evaluate', request);
    }
    async listPolicies() {
        return this.get('/policies');
    }
    async listScenarios() {
        return this.get('/scenarios');
    }
    async saveScenario(name, request) {
        return this.post('/scenarios', { name, request });
    }
    async replayScenario(id) {
        return this.post(`/scenarios/${id}/replay`);
    }
    async completeStepUp(request, challenges) {
        return this.evaluate({ ...request, challengeResponses: challenges });
    }
    async get(path) {
        return this.request(path, { method: 'GET' });
    }
    async post(path, body) {
        return this.request(path, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }
    async request(path, init) {
        const url = this.normalize(path);
        const response = await this.fetchImpl(url, {
            headers: this.defaultHeaders,
            ...init,
        });
        if (!response.ok) {
            const message = await safeErrorMessage(response);
            throw new Error(`CAB request failed (${response.status}): ${message}`);
        }
        return (await response.json());
    }
    normalize(path) {
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        if (!path.startsWith('/')) {
            path = `/${path}`;
        }
        return `${this.baseUrl}${path}`;
    }
}
exports.CABClient = CABClient;
async function safeErrorMessage(response) {
    try {
        const data = await response.json();
        if (typeof data === 'object' && data && 'error' in data) {
            return String(data.error);
        }
        return JSON.stringify(data);
    }
    catch (error) {
        return response.statusText || 'unknown error';
    }
}
