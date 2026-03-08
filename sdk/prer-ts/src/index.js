"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrerClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class PrerClient {
    baseUrl;
    fetchImpl;
    defaultActor;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.fetchImpl = options.fetchImpl ?? node_fetch_1.default;
        this.defaultActor = options.defaultActor;
    }
    async createExperiment(input) {
        const actor = input.actor ?? this.requireActor();
        const response = await this.fetchImpl(`${this.baseUrl}/experiments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...input, actor })
        });
        if (!response.ok) {
            throw new Error(`Failed to create experiment: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    async startExperiment(id, actor) {
        const resolvedActor = actor ?? this.requireActor();
        const response = await this.fetchImpl(`${this.baseUrl}/experiments/${id}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actor: resolvedActor })
        });
        if (!response.ok) {
            throw new Error(`Failed to start experiment: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    async ingestResult(id, input) {
        const actor = input.actor ?? this.requireActor();
        const response = await this.fetchImpl(`${this.baseUrl}/experiments/${id}/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...input, actor })
        });
        if (!response.ok) {
            throw new Error(`Failed to ingest result: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    async exportPreregistration(id, actor) {
        const resolvedActor = actor ?? this.requireActor();
        const response = await this.fetchImpl(`${this.baseUrl}/experiments/${id}/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actor: resolvedActor })
        });
        if (!response.ok) {
            throw new Error(`Failed to export preregistration: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    requireActor() {
        if (!this.defaultActor) {
            throw new Error('Actor must be provided when no defaultActor is configured.');
        }
        return this.defaultActor;
    }
}
exports.PrerClient = PrerClient;
