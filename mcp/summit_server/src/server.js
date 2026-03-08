"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpServer = void 0;
const crypto_1 = require("crypto");
const sanitize_js_1 = require("./sanitization/sanitize.js");
const evidence_store_js_1 = require("./evidence/evidence-store.js");
const tool_registry_js_1 = require("./tools/tool-registry.js");
const skills_registry_js_1 = require("./skills/skills-registry.js");
const builtin_tools_js_1 = require("./tools/builtin-tools.js");
const policy_gate_js_1 = require("./policy/policy-gate.js");
const react_loop_js_1 = require("./react/react-loop.js");
const stable_json_js_1 = require("./utils/stable-json.js");
class McpServer {
    toolRegistry;
    skillsRegistry;
    evidenceStore;
    options;
    activeSessions = new Map();
    constructor(toolRegistry, skillsRegistry, evidenceStore, options) {
        this.toolRegistry = toolRegistry;
        this.skillsRegistry = skillsRegistry;
        this.evidenceStore = evidenceStore;
        this.options = options;
    }
    static async create(options) {
        const skillsRegistry = await skills_registry_js_1.SkillsRegistry.load();
        const evidenceStore = new evidence_store_js_1.EvidenceStore();
        const toolRegistry = new tool_registry_js_1.ToolRegistry((0, builtin_tools_js_1.createBuiltinTools)({
            getToolIndex: () => toolRegistry.listIndex(),
            getToolSchema: (toolId) => toolRegistry.getSchema(toolId),
            skillsRegistry,
            evidenceStore,
        }));
        return new McpServer(toolRegistry, skillsRegistry, evidenceStore, {
            maxSessionsPerTenant: 3,
            maxToolCallsPerRequest: 5,
            ...options,
        });
    }
    async handle(request) {
        const sessionId = request.sessionId ?? (0, crypto_1.randomUUID)();
        const traceId = request.traceId ?? (0, crypto_1.randomUUID)();
        if (!this.registerSession(request.tenantId, sessionId)) {
            return {
                sessionId,
                traceId,
                ok: false,
                error: 'Max concurrent sessions exceeded for tenant',
            };
        }
        const context = {
            sessionId,
            traceId,
            tenantId: request.tenantId,
            actor: request.actor,
            purpose: request.purpose,
            scopes: request.scopes,
            breakGlass: request.breakGlass,
        };
        this.logEvent({
            timestamp: new Date().toISOString(),
            traceId,
            sessionId,
            type: 'request',
            detail: {
                type: request.request.type,
                actor: request.actor,
                purpose: request.purpose,
            },
        });
        try {
            if (request.request.type === 'route_tools') {
                const routed = this.toolRegistry.routeTools(request.request.query, request.request.limit ?? 5);
                return { sessionId, traceId, ok: true, data: routed };
            }
            if (request.request.type === 'react') {
                const response = await (0, react_loop_js_1.executeReact)(this.toolRegistry, context, request.request.react, this.options.maxToolCallsPerRequest, (toolId, input, toolContext) => this.executeTool(toolId, input, toolContext));
                return { sessionId, traceId, ok: true, data: response };
            }
            const result = await this.executeTool(request.request.toolId, request.request.input, context);
            return {
                sessionId,
                traceId,
                ok: result.ok,
                data: result.data,
                error: result.error,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logEvent({
                timestamp: new Date().toISOString(),
                traceId,
                sessionId,
                type: 'error',
                detail: { message },
            });
            return { sessionId, traceId, ok: false, error: message };
        }
    }
    async executeTool(toolId, input, context) {
        const tool = this.toolRegistry.getTool(toolId);
        const parsed = tool.schema.inputSchema.safeParse(input);
        if (!parsed.success) {
            return {
                ok: false,
                error: `Validation failed: ${parsed.error.message}`,
            };
        }
        const decision = (0, policy_gate_js_1.evaluatePolicy)(tool.schema, context);
        this.evidenceStore.recordPolicy(decision);
        this.logEvent({
            timestamp: new Date().toISOString(),
            traceId: context.traceId,
            sessionId: context.sessionId,
            type: 'policy',
            detail: decision,
        });
        if (decision.decision === 'deny') {
            return { ok: false, error: decision.reason };
        }
        const start = Date.now();
        const output = await tool.handler(parsed.data, context);
        const sanitized = (0, sanitize_js_1.sanitizeOutput)(output);
        this.evidenceStore.recordToolSchema({
            id: tool.schema.id,
            name: tool.schema.name,
            description: tool.schema.description,
            tags: tool.schema.tags,
            riskTier: tool.schema.riskTier,
            requiredScopes: tool.schema.requiredScopes,
            costHint: tool.schema.costHint,
            version: tool.schema.version,
            schemaHash: this.toolRegistry.getSchemaHash(tool.schema.id),
        });
        this.logEvent({
            timestamp: new Date().toISOString(),
            traceId: context.traceId,
            sessionId: context.sessionId,
            type: 'tool',
            detail: {
                toolId: tool.schema.id,
                durationMs: Date.now() - start,
            },
        });
        return { ok: true, data: sanitized };
    }
    logEvent(event) {
        this.evidenceStore.recordEvent(event);
        const payload = (0, stable_json_js_1.stableStringify)(event);
        console.info(payload);
    }
    registerSession(tenantId, sessionId) {
        const sessions = this.activeSessions.get(tenantId) ?? new Set();
        sessions.add(sessionId);
        this.activeSessions.set(tenantId, sessions);
        return sessions.size <= this.options.maxSessionsPerTenant;
    }
}
exports.McpServer = McpServer;
