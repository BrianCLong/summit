"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpClient = void 0;
const sse_1 = require("./sse");
class McpClient {
    baseUrl;
    token;
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
    }
    async connect(toolClass) {
        const res = await fetch(`${this.baseUrl}/v1/session`, {
            method: 'POST',
            headers: this.jsonHeaders(),
            body: JSON.stringify({ toolClass }),
        });
        if (!res.ok)
            throw new Error(`connect failed: ${res.status}`);
        return res.json();
    }
    async invoke(session, input) {
        const res = await fetch(`${this.baseUrl}/v1/session/${session.id}/invoke`, {
            method: 'POST',
            headers: this.jsonHeaders(),
            body: JSON.stringify(input),
        });
        if (!res.ok)
            throw new Error(`invoke failed: ${res.status}`);
        return res.json();
    }
    async release(session) {
        const res = await fetch(`${this.baseUrl}/v1/session/${session.id}`, {
            method: 'DELETE',
            headers: this.authHeaders(),
        });
        if (!res.ok && res.status !== 404)
            throw new Error(`release failed: ${res.status}`);
    }
    listTools() {
        return this.getTyped('/.well-known/mcp-tools');
    }
    listResources() {
        return this.getTyped('/.well-known/mcp-resources');
    }
    listPrompts() {
        return this.getTyped('/.well-known/mcp-prompts');
    }
    stream(session) {
        return (0, sse_1.sse)(`${this.baseUrl}/v1/stream/${session.id}`, this.authHeaders());
    }
    async getTyped(path) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            headers: this.authHeaders(),
        });
        if (!res.ok)
            throw new Error(`fetch ${path} failed: ${res.status}`);
        return res.json();
    }
    authHeaders() {
        return {
            authorization: `Bearer ${this.token}`,
        };
    }
    jsonHeaders() {
        return {
            'content-type': 'application/json',
            ...this.authHeaders(),
        };
    }
}
exports.McpClient = McpClient;
