"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxExecutionClient = void 0;
class SandboxExecutionClient {
    baseUrl;
    allowedHosts;
    allowLoopback;
    fetchFn;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, '');
        this.allowedHosts = options.allowedHosts ?? [];
        this.allowLoopback = options.allowLoopback ?? false;
        this.fetchFn = options.fetchFn ?? fetch;
        this.assertTrustedEndpoint();
    }
    async execute(request) {
        const response = await this.fetchFn(`${this.baseUrl}/api/v1/sandboxes/${request.sandboxId}/execute`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`Sandbox execution failed: ${response.status} ${message}`);
        }
        return response.json();
    }
    assertTrustedEndpoint() {
        const url = new URL(this.baseUrl);
        const host = url.hostname.toLowerCase();
        const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
        if (!this.allowLoopback && isLoopback) {
            throw new Error('Sandbox endpoint must not be loopback without explicit allowLoopback');
        }
        if (this.allowedHosts.length > 0 && !this.allowedHosts.includes(host)) {
            throw new Error(`Sandbox endpoint host ${host} is not in the allowed host list`);
        }
    }
}
exports.SandboxExecutionClient = SandboxExecutionClient;
