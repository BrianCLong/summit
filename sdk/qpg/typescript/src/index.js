"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QpgClient = void 0;
class QpgClient {
    baseUrl;
    fetcher;
    constructor(baseUrl, fetcher) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.fetcher = fetcher ?? globalThis.fetch;
        if (!this.fetcher) {
            throw new Error('fetch is not available; provide a fetch implementation');
        }
    }
    async tokenize(request) {
        const response = await this.fetcher(`${this.baseUrl}/tokenize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`tokenize failed with status ${response.status}`);
        }
        return (await response.json());
    }
    async reveal(request) {
        const response = await this.fetcher(`${this.baseUrl}/reveal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`reveal failed with status ${response.status}`);
        }
        const payload = (await response.json());
        return payload.value;
    }
}
exports.QpgClient = QpgClient;
