"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhantomConnector = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class PhantomConnector extends events_1.EventEmitter {
    config;
    rateLimiter = new Map();
    metrics;
    executions = new Map();
    constructor(config) {
        super();
        this.config = config;
        this.metrics = {
            totalContainers: 0,
            openContainers: 0,
            closedContainers: 0,
            totalArtifacts: 0,
            playbookRuns: 0,
            successfulActions: 0,
            failedActions: 0,
            averageResolutionTime: 0,
            apiCalls: 0,
            errorRate: 0,
        };
    }
    async makeRequest(endpoint, method = 'GET', data) {
        await this.checkRateLimit();
        const url = `${this.config.baseUrl}/rest${endpoint}`;
        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${this.config.token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
        });
        this.metrics.apiCalls++;
        if (!response.ok) {
            this.metrics.errorRate = this.metrics.errorRate + 1;
            throw new Error(`Phantom API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }
    async checkRateLimit() {
        const now = Date.now();
        const minute = Math.floor(now / 60000);
        const requests = this.rateLimiter.get(minute.toString()) || 0;
        if (requests >= this.config.rateLimitRpm) {
            const waitTime = 60000 - (now % 60000);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        this.rateLimiter.set(minute.toString(), requests + 1);
        // Clean up old entries
        for (const [key] of this.rateLimiter) {
            if (parseInt(key) < minute - 1) {
                this.rateLimiter.delete(key);
            }
        }
    }
    async createContainer(containerData) {
        try {
            const response = await this.makeRequest('/container', 'POST', containerData);
            const container = {
                id: response.id,
                artifact_count: 0,
                playbook_runs: 0,
                ...containerData,
            };
            this.metrics.totalContainers++;
            if (container.status === 'open') {
                this.metrics.openContainers++;
            }
            this.emit('container_created', {
                containerId: container.id,
                name: container.name,
                severity: container.severity,
                timestamp: new Date(),
            });
            return container;
        }
        catch (error) {
            this.emit('container_creation_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                containerData,
                timestamp: new Date(),
            });
            throw error;
        }
    }
    async createIncident(incident) {
        const container = await this.createContainer({
            name: incident.title,
            description: incident.description,
            label: 'incident',
            status: 'new',
            severity: incident.severity,
            sensitivity: 'amber',
            owner_id: 1,
            tenant_id: 1,
            start_time: new Date().toISOString(),
            container_type: 'default',
            custom_fields: {
                source: incident.source,
                source_id: incident.sourceId,
                ...incident.customFields,
            },
        });
        // Add artifacts to the container
        for (const artifactData of incident.artifacts) {
            await this.addArtifact({
                ...artifactData,
                container_id: container.id,
            });
        }
        // Add tags
        if (incident.tags.length > 0) {
            await this.tagContainer(container.id, incident.tags);
        }
        this.emit('incident_created', {
            containerId: container.id,
            incidentId: incident.sourceId,
            artifactCount: incident.artifacts.length,
            timestamp: new Date(),
        });
        return container;
    }
    async addArtifact(artifact) {
        try {
            const response = await this.makeRequest('/artifact', 'POST', artifact);
            const createdArtifact = {
                id: response.id,
                ...artifact,
            };
            this.metrics.totalArtifacts++;
            this.emit('artifact_created', {
                artifactId: createdArtifact.id,
                containerId: artifact.container_id,
                name: artifact.name,
                timestamp: new Date(),
            });
            return createdArtifact;
        }
        catch (error) {
            this.emit('artifact_creation_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                artifact,
                timestamp: new Date(),
            });
            throw error;
        }
    }
    async getContainer(containerId) {
        const response = await this.makeRequest(`/container/${containerId}`);
        return response;
    }
    async updateContainer(containerId, updates) {
        const response = await this.makeRequest(`/container/${containerId}`, 'POST', updates);
        if (updates.status) {
            if (updates.status === 'closed') {
                this.metrics.openContainers--;
                this.metrics.closedContainers++;
            }
            else if (updates.status === 'open') {
                this.metrics.openContainers++;
            }
        }
        this.emit('container_updated', {
            containerId,
            updates,
            timestamp: new Date(),
        });
        return response;
    }
    async closeContainer(containerId, reason) {
        return await this.updateContainer(containerId, {
            status: 'closed',
            close_time: new Date().toISOString(),
            custom_fields: reason ? { close_reason: reason } : undefined,
        });
    }
    async tagContainer(containerId, tags) {
        await this.makeRequest(`/container/${containerId}/tags`, 'POST', { tags });
        this.emit('container_tagged', {
            containerId,
            tags,
            timestamp: new Date(),
        });
    }
    async listPlaybooks(category) {
        const endpoint = category ? `/playbook?category=${category}` : '/playbook';
        const response = await this.makeRequest(endpoint);
        return response.data || [];
    }
    async runPlaybook(playbookId, containerId, inputs = {}) {
        try {
            const response = await this.makeRequest('/playbook_run', 'POST', {
                playbook_id: playbookId,
                container_id: containerId,
                scope: 'new',
                run_data: inputs,
            });
            const execution = {
                id: crypto_1.default.randomUUID(),
                playbookId,
                containerId,
                status: 'queued',
                startTime: new Date(),
                inputs,
                actions: [],
            };
            this.executions.set(execution.id, execution);
            this.metrics.playbookRuns++;
            this.emit('playbook_started', {
                executionId: execution.id,
                playbookId,
                containerId,
                timestamp: execution.startTime,
            });
            // Monitor the playbook execution
            this.monitorPlaybookExecution(response.playbook_run_id, execution.id);
            return execution;
        }
        catch (error) {
            this.emit('playbook_failed', {
                playbookId,
                containerId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            });
            throw error;
        }
    }
    async monitorPlaybookExecution(runId, executionId) {
        const checkInterval = setInterval(async () => {
            try {
                const execution = this.executions.get(executionId);
                if (!execution) {
                    clearInterval(checkInterval);
                    return;
                }
                const response = await this.makeRequest(`/playbook_run/${runId}`);
                execution.status = this.mapPhantomStatus(response.status);
                if (response.status === 'success' || response.status === 'failed') {
                    execution.endTime = new Date();
                    execution.outputs = response.result_data;
                    if (response.status === 'failed') {
                        execution.error = response.message;
                    }
                    clearInterval(checkInterval);
                    this.emit('playbook_completed', {
                        executionId,
                        status: execution.status,
                        duration: execution.endTime.getTime() - execution.startTime.getTime(),
                        timestamp: execution.endTime,
                    });
                }
                // Get action results
                const actions = await this.getPlaybookActions(runId);
                execution.actions = actions;
                this.metrics.successfulActions += actions.filter((a) => a.status === 'success').length;
                this.metrics.failedActions += actions.filter((a) => a.status === 'failed').length;
            }
            catch (error) {
                this.emit('playbook_monitor_error', {
                    executionId,
                    runId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }, 5000);
    }
    mapPhantomStatus(phantomStatus) {
        switch (phantomStatus) {
            case 'running':
                return 'running';
            case 'success':
                return 'completed';
            case 'failed':
                return 'failed';
            case 'cancelled':
                return 'cancelled';
            default:
                return 'queued';
        }
    }
    async getPlaybookActions(runId) {
        const response = await this.makeRequest(`/action_run?playbook_run_id=${runId}`);
        return response.data || [];
    }
    async executeAction(appName, actionName, parameters, containerId, assets) {
        try {
            const response = await this.makeRequest('/action_run', 'POST', {
                action: actionName,
                app: appName,
                parameters,
                container_id: containerId,
                assets: assets || [],
            });
            const action = {
                id: response.id,
                name: actionName,
                action: actionName,
                app: appName,
                parameters,
                status: 'running',
                message: '',
                result_data: [],
                summary: {},
                playbook_run_id: 0,
                container_id: containerId,
                start_time: new Date().toISOString(),
            };
            this.emit('action_executed', {
                actionId: action.id,
                actionName,
                appName,
                containerId,
                timestamp: new Date(),
            });
            return action;
        }
        catch (error) {
            this.emit('action_failed', {
                actionName,
                appName,
                containerId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            });
            throw error;
        }
    }
    async searchContainers(query) {
        const params = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });
        const response = await this.makeRequest(`/container?${params.toString()}`);
        return response.data || [];
    }
    async getArtifacts(containerId) {
        const response = await this.makeRequest(`/artifact?container_id=${containerId}`);
        return response.data || [];
    }
    async addComment(containerId, comment, author) {
        await this.makeRequest('/note', 'POST', {
            container_id: containerId,
            title: 'Automated Comment',
            content: comment,
            note_type: 'general',
            author: author || 'IntelGraph',
        });
        this.emit('comment_added', {
            containerId,
            comment,
            author: author || 'IntelGraph',
            timestamp: new Date(),
        });
    }
    async addEvidence(containerId, evidence) {
        await this.makeRequest('/vault_info', 'POST', {
            container_id: containerId,
            name: evidence.name,
            metadata: {
                description: evidence.description,
                type: 'evidence',
            },
            file_path: evidence.file_path,
            vault_id: evidence.vault_id,
            url: evidence.url,
        });
        this.emit('evidence_added', {
            containerId,
            evidenceName: evidence.name,
            timestamp: new Date(),
        });
    }
    getExecution(executionId) {
        return this.executions.get(executionId);
    }
    listExecutions() {
        return Array.from(this.executions.values());
    }
    getMetrics() {
        return { ...this.metrics };
    }
    async testConnection() {
        try {
            await this.makeRequest('/system_info');
            this.emit('connection_tested', {
                success: true,
                timestamp: new Date(),
            });
            return true;
        }
        catch (error) {
            this.emit('connection_tested', {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            });
            return false;
        }
    }
    async getSystemInfo() {
        return await this.makeRequest('/system_info');
    }
}
exports.PhantomConnector = PhantomConnector;
