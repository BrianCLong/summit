"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerApi = registerApi;
const zod_1 = require("zod");
const scheduler_1 = require("./scheduler");
const authz_1 = require("./authz");
const httpSse_1 = require("./transport/httpSse");
const telemetry_1 = require("./telemetry");
const replay_client_1 = require("./replay-client");
const vm_pool_1 = require("./vm-pool");
const scheduler = new scheduler_1.Scheduler();
const TOOL_MANIFEST = [
    {
        name: 'echo',
        description: 'Echoes input payloads using the runtime sandbox',
        scopes: ['read', 'write'],
    },
    { name: 'ping', description: 'Liveness check utility', scopes: ['read'] },
];
const RESOURCE_MANIFEST = [
    { name: 'health', description: 'Runtime health snapshot', version: 'v1' },
];
const PROMPT_MANIFEST = [
    {
        name: 'quickstart',
        version: 'v1',
        description: 'Guide for connecting to IntelGraph MCP',
    },
];
(0, vm_pool_1.startPrewarmManager)(TOOL_MANIFEST.map((t) => t.name));
function registerApi(app) {
    app.post('/v1/session', async (req, reply) => {
        const body = zod_1.z
            .object({ toolClass: zod_1.z.string(), caps: zod_1.z.array(zod_1.z.string()).default([]) })
            .parse(req.body);
        const tenant = req.headers['x-tenant-id'] ?? 'demo';
        const purpose = req.headers['x-purpose'] ?? 'ops';
        await (0, authz_1.authorize)(req.headers.authorization, {
            action: 'allocate',
            tenant,
            toolClass: body.toolClass,
            capabilityScopes: body.caps,
            purpose,
        });
        const session = await scheduler.allocate(body.toolClass);
        (0, httpSse_1.publish)(session.id, {
            event: 'session.ready',
            data: JSON.stringify({
                sessionId: session.id,
                toolClass: session.vm.toolClass,
            }),
            recordingId: session.recordingId,
        });
        (0, telemetry_1.emitFrame)('out', 'jsonrpc', {
            'mcp.session.id': session.id,
            'mcp.session.toolClass': session.vm.toolClass,
            'mcp.event': 'session.created',
        });
        void (0, replay_client_1.recordEvent)(session.recordingId, 'out', 'jsonrpc', {
            event: 'session.created',
            toolClass: session.vm.toolClass,
        });
        return reply.code(201).send({
            id: session.id,
            toolClass: session.vm.toolClass,
            transport: session.transport,
            createdAt: session.createdAt,
        });
    });
    app.post('/v1/session/:id/invoke', async (req, reply) => {
        const params = zod_1.z.object({ id: zod_1.z.string() }).parse(req.params);
        const body = zod_1.z.object({ fn: zod_1.z.string(), args: zod_1.z.any() }).parse(req.body);
        const session = scheduler.get(params.id);
        void (0, replay_client_1.recordEvent)(session?.recordingId, 'in', 'jsonrpc', {
            fn: body.fn,
            args: body.args,
        });
        const result = await scheduler.invoke(params.id, body.fn, body.args);
        (0, httpSse_1.publish)(params.id, {
            event: 'session.invoke',
            data: JSON.stringify({ sessionId: params.id, fn: body.fn, result }),
            recordingId: session?.recordingId,
        });
        (0, telemetry_1.emitFrame)('out', 'jsonrpc', {
            'mcp.session.id': params.id,
            'mcp.invoke.fn': body.fn,
        });
        void (0, replay_client_1.recordEvent)(session?.recordingId, 'out', 'jsonrpc', {
            fn: body.fn,
            result,
        });
        return reply.send(result);
    });
    app.delete('/v1/session/:id', async (req, reply) => {
        const params = zod_1.z.object({ id: zod_1.z.string() }).parse(req.params);
        const session = scheduler.get(params.id);
        await scheduler.release(params.id);
        (0, httpSse_1.publish)(params.id, {
            event: 'session.closed',
            data: JSON.stringify({ sessionId: params.id }),
            recordingId: session?.recordingId,
        });
        (0, telemetry_1.emitFrame)('out', 'jsonrpc', {
            'mcp.session.id': params.id,
            'mcp.event': 'session.closed',
        });
        void (0, replay_client_1.recordEvent)(session?.recordingId, 'out', 'jsonrpc', {
            event: 'session.closed',
        });
        return reply.code(204).send();
    });
    app.get('/.well-known/mcp-tools', async (_req, reply) => {
        return reply.send(TOOL_MANIFEST);
    });
    app.get('/.well-known/mcp-resources', async (_req, reply) => {
        return reply.send(RESOURCE_MANIFEST);
    });
    app.get('/.well-known/mcp-prompts', async (_req, reply) => {
        return reply.send(PROMPT_MANIFEST);
    });
    app.post('/jsonrpc', async (req, reply) => {
        const body = req.body;
        if (typeof body !== 'object' || body === null) {
            return reply
                .code(400)
                .send(jsonRpcError(null, -32600, 'Invalid Request'));
        }
        const rpc = body;
        if (rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
            return reply
                .code(400)
                .send(jsonRpcError(rpc.id ?? null, -32600, 'Invalid Request'));
        }
        const id = rpc.id ?? null;
        if (rpc.method === 'mcp.ping') {
            if (rpc.params !== undefined && typeof rpc.params !== 'object') {
                const error = jsonRpcError(id, -32602, 'Invalid params');
                void (0, replay_client_1.recordEvent)(undefined, 'in', 'jsonrpc', rpc);
                void (0, replay_client_1.recordEvent)(undefined, 'out', 'jsonrpc', error);
                return reply.code(400).send(error);
            }
            (0, telemetry_1.emitFrame)('in', 'jsonrpc', {
                'rpc.method': rpc.method,
                'rpc.id': id ?? 'null',
            });
            void (0, replay_client_1.recordEvent)(undefined, 'in', 'jsonrpc', rpc);
            const response = { jsonrpc: '2.0', id, result: { ok: true } };
            void (0, replay_client_1.recordEvent)(undefined, 'out', 'jsonrpc', response);
            return reply.send(response);
        }
        const invokePayload = zod_1.z
            .object({
            toolClass: zod_1.z.string().optional(),
            args: zod_1.z.any().optional(),
            sessionId: zod_1.z.string().optional(),
            keepAlive: zod_1.z.boolean().optional(),
            caps: zod_1.z.array(zod_1.z.string()).optional(),
        })
            .parse(rpc.params ?? {});
        let session = invokePayload.sessionId
            ? (scheduler.get(invokePayload.sessionId) ?? undefined)
            : undefined;
        let created = false;
        if (!session) {
            if (invokePayload.caps) {
                await (0, authz_1.authorize)(req.headers.authorization, {
                    action: 'allocate',
                    tenant: req.headers['x-tenant-id'] ?? 'demo',
                    toolClass: invokePayload.toolClass ?? rpc.method,
                    capabilityScopes: invokePayload.caps,
                    purpose: req.headers['x-purpose'] ?? 'ops',
                });
            }
            session = await scheduler.allocate(invokePayload.toolClass ?? rpc.method);
            (0, httpSse_1.publish)(session.id, {
                event: 'session.ready',
                data: JSON.stringify({
                    sessionId: session.id,
                    toolClass: session.vm.toolClass,
                }),
                recordingId: session.recordingId,
            });
            created = true;
        }
        const args = invokePayload.args ?? {};
        (0, telemetry_1.emitFrame)('in', 'jsonrpc', {
            'rpc.method': rpc.method,
            'rpc.id': id ?? 'null',
            'mcp.session.id': session.id,
        });
        void (0, replay_client_1.recordEvent)(session.recordingId, 'in', 'jsonrpc', {
            method: rpc.method,
            args,
        });
        try {
            await (0, authz_1.authorize)(req.headers.authorization, {
                action: 'invoke',
                tenant: req.headers['x-tenant-id'] ?? 'demo',
                toolClass: session.vm.toolClass,
                capabilityScopes: invokePayload.caps,
                purpose: req.headers['x-purpose'] ?? 'ops',
            });
            const result = await scheduler.invoke(session.id, rpc.method, args);
            (0, httpSse_1.publish)(session.id, {
                event: 'session.invoke',
                data: JSON.stringify({ sessionId: session.id, fn: rpc.method, result }),
                recordingId: session.recordingId,
            });
            (0, telemetry_1.emitFrame)('out', 'jsonrpc', {
                'mcp.session.id': session.id,
                'mcp.invoke.fn': rpc.method,
            });
            void (0, replay_client_1.recordEvent)(session.recordingId, 'out', 'jsonrpc', {
                method: rpc.method,
                result,
            });
            const response = { jsonrpc: '2.0', id, result };
            if (created && !invokePayload.keepAlive) {
                await scheduler.release(session.id);
            }
            return reply.send(response);
        }
        catch (error) {
            const err = jsonRpcError(id, -32000, error.message ?? 'invoke failed');
            void (0, replay_client_1.recordEvent)(session.recordingId, 'out', 'jsonrpc', err);
            if (created)
                await scheduler.release(session.id);
            return reply.code(500).send(err);
        }
    });
}
function jsonRpcError(id, code, message) {
    return {
        jsonrpc: '2.0',
        id,
        error: { code, message },
    };
}
