"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComfyClient = void 0;
class ComfyClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async runGraph(graphJson, params = {}) {
        // Scaffold: POST to ComfyUI /prompt endpoint, poll for results
        return { id: `comfy-${Date.now()}`, status: 'QUEUED', outputs: [] };
    }
}
exports.ComfyClient = ComfyClient;
