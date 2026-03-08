"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sandbox = void 0;
const audit_1 = require("./audit");
const policy_1 = require("./policy");
const quota_1 = require("./quota");
class GuardedSandboxContext {
    policy;
    auditLog;
    parentId;
    artifacts = [];
    logs = [];
    consumedBytes = 0;
    constructor(policy, auditLog, parentId) {
        this.policy = policy;
        this.auditLog = auditLog;
        this.parentId = parentId;
    }
    requestSyscall(syscall) {
        if (this.policy.deniedSyscalls.has(syscall) ||
            (!this.policy.allowAllSyscalls && !this.policy.allowedSyscalls.has(syscall))) {
            this.auditLog.record('violation', {
                kind: 'syscall',
                syscall,
                message: `Denied syscall ${syscall}`
            }, this.parentId);
            throw new Error(`Syscall ${syscall} denied by policy`);
        }
        this.auditLog.record('tool-execution', {
            stage: 'syscall',
            syscall
        }, this.parentId);
    }
    async fetch(target) {
        let destination;
        try {
            const url = new URL(target);
            const port = url.port || (url.protocol === 'https:' ? '443' : '80');
            destination = `${url.hostname}:${port}`;
        }
        catch (error) {
            throw new Error(`Invalid URL ${target}: ${error.message}`);
        }
        if (this.policy.deniedAllNetwork) {
            this.auditLog.record('violation', {
                kind: 'network',
                destination,
                message: 'Network egress denied by policy'
            }, this.parentId);
            throw new Error('Network egress denied by policy');
        }
        if (!this.policy.allowAllNetwork) {
            const hostAllowed = this.policy.allowedNetworkDestinations.has(destination);
            const hostname = destination.split(':')[0] ?? destination;
            const hostnameAllowed = this.policy.allowedNetworkDestinations.has(hostname);
            if (!hostAllowed && !hostnameAllowed) {
                this.auditLog.record('violation', {
                    kind: 'network',
                    destination,
                    message: 'Network destination not allowlisted'
                }, this.parentId);
                throw new Error(`Network destination ${destination} not allowlisted`);
            }
        }
        this.auditLog.record('tool-execution', {
            stage: 'network-egress',
            destination
        }, this.parentId);
        return `Egress to ${destination} suppressed in sandbox`;
    }
    createArtifact(artifact) {
        const size = Buffer.byteLength(artifact.content, 'utf8');
        this.ensureBudget(size, `artifact ${artifact.name}`);
        this.artifacts.push(artifact);
        this.consumedBytes += size;
        this.auditLog.record('artifact', {
            name: artifact.name,
            mediaType: artifact.mediaType,
            size
        }, this.parentId);
    }
    appendLog(message) {
        this.logs.push(message);
    }
    getRemainingOutputBudget() {
        return Math.max(this.policy.outputMaxBytes - this.consumedBytes, 0);
    }
    getArtifacts() {
        return [...this.artifacts];
    }
    getLogs() {
        return [...this.logs];
    }
    getConsumedBytes() {
        return this.consumedBytes;
    }
    ensureBudget(size, context) {
        if (this.consumedBytes + size > this.policy.outputMaxBytes) {
            this.auditLog.record('violation', {
                kind: 'output',
                context,
                message: 'Output budget exceeded'
            }, this.parentId);
            throw new Error('Output budget exceeded');
        }
    }
}
function normalizeResult(rawResult, context, policy, auditLog, toolEventId) {
    const result = {
        stdout: rawResult?.stdout,
        artifacts: [],
        logs: []
    };
    let remaining = policy.outputMaxBytes - context.getConsumedBytes();
    if (rawResult?.stdout) {
        const size = Buffer.byteLength(rawResult.stdout, 'utf8');
        if (size > remaining) {
            auditLog.record('violation', {
                kind: 'output',
                context: 'stdout',
                message: 'Output budget exceeded'
            }, toolEventId);
            throw new Error('Output budget exceeded');
        }
        remaining -= size;
        result.stdout = rawResult.stdout;
    }
    const combinedArtifacts = [];
    for (const artifact of context.getArtifacts()) {
        combinedArtifacts.push(artifact);
    }
    if (rawResult?.artifacts) {
        for (const artifact of rawResult.artifacts) {
            const size = Buffer.byteLength(artifact.content, 'utf8');
            if (size > remaining) {
                auditLog.record('violation', {
                    kind: 'output',
                    context: `artifact ${artifact.name}`,
                    message: 'Output budget exceeded'
                }, toolEventId);
                throw new Error('Output budget exceeded');
            }
            remaining -= size;
            combinedArtifacts.push(artifact);
            auditLog.record('artifact', {
                name: artifact.name,
                mediaType: artifact.mediaType,
                size
            }, toolEventId);
        }
    }
    result.artifacts = combinedArtifacts;
    result.logs = [...(rawResult?.logs ?? []), ...context.getLogs()];
    return result;
}
class Sandbox {
    tools = new Map();
    auditLog;
    quotaManager;
    policyEngine;
    constructor(options) {
        this.auditLog = options.auditLog ?? new audit_1.AuditLog();
        this.quotaManager = options.quotaManager ?? new quota_1.TenantQuotaManager();
        this.policyEngine = new policy_1.PolicyEngine(options.policySource, this.quotaManager);
    }
    registerTool(tool) {
        this.tools.set(tool.name, tool);
    }
    getAuditLog() {
        return this.auditLog;
    }
    async run(request) {
        const requestEvent = this.auditLog.record('request', {
            requestId: request.id,
            tenantId: request.tenantId,
            toolName: request.toolName
        });
        const tool = this.tools.get(request.toolName);
        const policy = this.policyEngine.getPolicyForTenant(request.tenantId);
        if (!tool) {
            this.auditLog.record('violation', {
                kind: 'tool',
                message: `Tool ${request.toolName} is not registered`
            }, requestEvent.id);
            return {
                allowed: false,
                decision: {
                    allowed: false,
                    reason: `Tool ${request.toolName} is not registered`,
                    policy
                }
            };
        }
        const decision = this.policyEngine.evaluate(request, tool, this.quotaManager);
        if (!decision.allowed) {
            this.auditLog.record('violation', {
                kind: 'policy',
                reason: decision.reason
            }, requestEvent.id);
            return {
                allowed: false,
                decision
            };
        }
        const toolEvent = this.auditLog.record('tool-execution', {
            stage: 'start',
            toolName: tool.name
        }, requestEvent.id);
        const context = new GuardedSandboxContext(decision.policy, this.auditLog, toolEvent.id);
        try {
            const rawResult = await tool.handler(request, context);
            const result = normalizeResult(rawResult, context, decision.policy, this.auditLog, toolEvent.id);
            this.auditLog.record('tool-execution', {
                stage: 'finish',
                toolName: tool.name
            }, toolEvent.id);
            return {
                allowed: true,
                result,
                decision
            };
        }
        catch (error) {
            this.auditLog.record('violation', {
                kind: 'runtime',
                message: error.message
            }, toolEvent.id);
            return {
                allowed: false,
                decision: {
                    allowed: false,
                    reason: error.message,
                    policy: decision.policy
                }
            };
        }
    }
}
exports.Sandbox = Sandbox;
