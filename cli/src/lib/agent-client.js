"use strict";
/**
 * Agent Client
 * Interface for spinning up and managing IntelGraph agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentClient = void 0;
exports.createAgentClient = createAgentClient;
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const constants_js_1 = require("./constants.js");
const AgentConfigSchema = zod_1.z.object({
    id: zod_1.z.string().default(() => (0, uuid_1.v4)()),
    name: zod_1.z.string().min(1),
    type: zod_1.z.enum(constants_js_1.AGENT_TYPES),
    description: zod_1.z.string().optional(),
    parameters: zod_1.z.record(zod_1.z.unknown()).default({}),
    timeout: zod_1.z.number().default(constants_js_1.DEFAULT_TIMEOUT_MS),
    retries: zod_1.z.number().min(0).max(10).default(3),
    dependencies: zod_1.z.array(zod_1.z.string()).default([]),
});
class AgentClient {
    config;
    agents = new Map();
    eventListeners = new Map();
    constructor(config) {
        this.config = config;
    }
    async spin(agentConfig, options = {}) {
        const config = AgentConfigSchema.parse({
            ...agentConfig,
            id: agentConfig.id || (0, uuid_1.v4)(),
        });
        const status = {
            id: config.id,
            name: config.name,
            type: config.type,
            status: 'pending',
            progress: 0,
            logs: [],
        };
        this.agents.set(config.id, status);
        // If async mode, return immediately
        if (options.async) {
            this.runAgentAsync(config, options);
            return status;
        }
        // Run synchronously with progress tracking
        return this.runAgent(config, options);
    }
    async spinBatch(configs, options = {}) {
        const { parallel = false, maxConcurrent = this.config.maxConcurrent } = options;
        if (parallel) {
            // Run agents in parallel with concurrency limit
            const results = [];
            const pending = [...configs];
            const running = [];
            while (pending.length > 0 || running.length > 0) {
                // Start new agents up to concurrency limit
                while (pending.length > 0 && running.length < maxConcurrent) {
                    const config = pending.shift();
                    running.push(this.spin(config, { ...options, async: false }));
                }
                // Wait for at least one to complete
                if (running.length > 0) {
                    const completed = await Promise.race(running.map((p, i) => p.then((r) => ({ result: r, index: i }))));
                    results.push(completed.result);
                    running.splice(completed.index, 1);
                }
            }
            return results;
        }
        else {
            // Run sequentially
            const results = [];
            for (const config of configs) {
                results.push(await this.spin(config, options));
            }
            return results;
        }
    }
    async getStatus(agentId) {
        // First check local cache
        if (this.agents.has(agentId)) {
            return this.agents.get(agentId);
        }
        // If remote endpoint configured, fetch from server
        if (this.config.endpoint) {
            try {
                const response = await fetch(`${this.config.endpoint}/agents/${agentId}`, {
                    headers: this.getHeaders(),
                });
                if (response.ok) {
                    const data = await response.json();
                    return data;
                }
            }
            catch {
                // Fall through to return null
            }
        }
        return null;
    }
    async cancel(agentId) {
        const status = this.agents.get(agentId);
        if (!status) {
            return false;
        }
        if (status.status === 'completed' || status.status === 'failed') {
            return false;
        }
        status.status = 'cancelled';
        status.completedAt = new Date();
        this.notifyListeners(agentId, status);
        // If remote endpoint, send cancel request
        if (this.config.endpoint) {
            try {
                await fetch(`${this.config.endpoint}/agents/${agentId}/cancel`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                });
            }
            catch {
                // Local cancellation already done
            }
        }
        return true;
    }
    async list(filter) {
        let agents = Array.from(this.agents.values());
        if (filter?.type) {
            agents = agents.filter((a) => a.type === filter.type);
        }
        if (filter?.status) {
            agents = agents.filter((a) => a.status === filter.status);
        }
        return agents;
    }
    onStatusChange(agentId, callback) {
        if (!this.eventListeners.has(agentId)) {
            this.eventListeners.set(agentId, []);
        }
        this.eventListeners.get(agentId).push(callback);
        // Return unsubscribe function
        return () => {
            const listeners = this.eventListeners.get(agentId);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }
    async runAgent(config, options) {
        const status = this.agents.get(config.id);
        status.status = 'running';
        status.startedAt = new Date();
        this.addLog(status, 'info', `Starting agent: ${config.name}`);
        this.notifyListeners(config.id, status);
        options.onProgress?.(status);
        try {
            // Execute agent logic based on type
            const result = await this.executeAgent(config, status, options);
            status.status = 'completed';
            status.progress = 100;
            status.completedAt = new Date();
            status.result = result;
            this.addLog(status, 'info', `Agent completed successfully`);
        }
        catch (error) {
            status.status = 'failed';
            status.completedAt = new Date();
            status.error = error instanceof Error ? error.message : String(error);
            this.addLog(status, 'error', `Agent failed: ${status.error}`);
        }
        this.notifyListeners(config.id, status);
        options.onProgress?.(status);
        return status;
    }
    async runAgentAsync(config, options) {
        // Run in background
        this.runAgent(config, options).catch(() => {
            // Errors are handled in runAgent
        });
    }
    async executeAgent(config, status, options) {
        // If remote endpoint configured, dispatch to server
        if (this.config.endpoint) {
            return this.executeRemoteAgent(config, status, options);
        }
        // Local execution based on agent type
        switch (config.type) {
            case 'investigation':
                return this.executeInvestigationAgent(config, status, options);
            case 'enrichment':
                return this.executeEnrichmentAgent(config, status, options);
            case 'analysis':
                return this.executeAnalysisAgent(config, status, options);
            case 'correlation':
                return this.executeCorrelationAgent(config, status, options);
            case 'report':
                return this.executeReportAgent(config, status, options);
            default:
                throw new Error(`Unknown agent type: ${config.type}`);
        }
    }
    async executeRemoteAgent(config, status, options) {
        const response = await fetch(`${this.config.endpoint}/agents`, {
            method: 'POST',
            headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config),
        });
        if (!response.ok) {
            throw new Error(`Remote agent creation failed: ${response.statusText}`);
        }
        const { id } = await response.json();
        // Poll for completion
        const pollInterval = options.pollInterval || 1000;
        const timeout = options.waitTimeout || config.timeout || this.config.timeout;
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const remoteStatus = await this.getStatus(id);
            if (remoteStatus) {
                status.progress = remoteStatus.progress;
                status.logs = remoteStatus.logs;
                this.notifyListeners(config.id, status);
                options.onProgress?.(status);
                if (remoteStatus.status === 'completed') {
                    return remoteStatus.result;
                }
                if (remoteStatus.status === 'failed') {
                    throw new Error(remoteStatus.error || 'Agent failed');
                }
                if (remoteStatus.status === 'cancelled') {
                    throw new Error('Agent was cancelled');
                }
            }
            await this.sleep(pollInterval);
        }
        throw new Error('Agent execution timed out');
    }
    async executeInvestigationAgent(config, status, options) {
        this.addLog(status, 'info', 'Running investigation agent');
        status.progress = 10;
        this.notifyListeners(config.id, status);
        options.onProgress?.(status);
        // Simulate investigation steps
        await this.sleep(500);
        status.progress = 30;
        this.addLog(status, 'info', 'Collecting evidence');
        this.notifyListeners(config.id, status);
        await this.sleep(500);
        status.progress = 60;
        this.addLog(status, 'info', 'Analyzing patterns');
        this.notifyListeners(config.id, status);
        await this.sleep(500);
        status.progress = 90;
        this.addLog(status, 'info', 'Generating findings');
        this.notifyListeners(config.id, status);
        return {
            findings: [],
            confidence: 0.85,
            recommendations: [],
        };
    }
    async executeEnrichmentAgent(config, status, _options) {
        this.addLog(status, 'info', 'Running enrichment agent');
        status.progress = 25;
        this.notifyListeners(config.id, status);
        await this.sleep(300);
        status.progress = 50;
        this.addLog(status, 'info', 'Fetching external data');
        this.notifyListeners(config.id, status);
        await this.sleep(300);
        status.progress = 75;
        this.addLog(status, 'info', 'Merging enrichments');
        this.notifyListeners(config.id, status);
        return {
            enrichedEntities: 0,
            sources: [],
        };
    }
    async executeAnalysisAgent(config, status, _options) {
        this.addLog(status, 'info', 'Running analysis agent');
        status.progress = 20;
        this.notifyListeners(config.id, status);
        await this.sleep(400);
        status.progress = 50;
        this.addLog(status, 'info', 'Computing metrics');
        this.notifyListeners(config.id, status);
        await this.sleep(400);
        status.progress = 80;
        this.addLog(status, 'info', 'Generating insights');
        this.notifyListeners(config.id, status);
        return {
            metrics: {},
            insights: [],
        };
    }
    async executeCorrelationAgent(config, status, _options) {
        this.addLog(status, 'info', 'Running correlation agent');
        status.progress = 15;
        this.notifyListeners(config.id, status);
        await this.sleep(600);
        status.progress = 45;
        this.addLog(status, 'info', 'Finding connections');
        this.notifyListeners(config.id, status);
        await this.sleep(600);
        status.progress = 85;
        this.addLog(status, 'info', 'Scoring correlations');
        this.notifyListeners(config.id, status);
        return {
            correlations: [],
            clusters: [],
        };
    }
    async executeReportAgent(config, status, _options) {
        this.addLog(status, 'info', 'Running report agent');
        status.progress = 20;
        this.notifyListeners(config.id, status);
        await this.sleep(200);
        status.progress = 60;
        this.addLog(status, 'info', 'Compiling report');
        this.notifyListeners(config.id, status);
        await this.sleep(200);
        status.progress = 90;
        this.addLog(status, 'info', 'Formatting output');
        this.notifyListeners(config.id, status);
        return {
            reportId: (0, uuid_1.v4)(),
            format: 'pdf',
            sections: [],
        };
    }
    addLog(status, level, message, data) {
        const entry = {
            timestamp: new Date(),
            level,
            message,
            data,
        };
        status.logs.push(entry);
    }
    notifyListeners(agentId, status) {
        const listeners = this.eventListeners.get(agentId);
        if (listeners) {
            for (const callback of listeners) {
                callback(status);
            }
        }
    }
    getHeaders() {
        const headers = {};
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        return headers;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.AgentClient = AgentClient;
function createAgentClient(config) {
    return new AgentClient(config);
}
