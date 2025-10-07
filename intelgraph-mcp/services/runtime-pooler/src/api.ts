import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Scheduler } from './scheduler';
import { authorize } from './authz';
import { publish } from './transport/httpSse';
import { emitFrame } from './telemetry';
import { recordEvent } from './replay-client';
import { startPrewarmManager } from './vm-pool';

const scheduler = new Scheduler();

const TOOL_MANIFEST = [
  { name: 'echo', description: 'Echoes input payloads using the runtime sandbox', scopes: ['read', 'write'] },
  { name: 'ping', description: 'Liveness check utility', scopes: ['read'] }
];

const RESOURCE_MANIFEST = [
  { name: 'health', description: 'Runtime health snapshot', version: 'v1' }
];

const PROMPT_MANIFEST = [
  { name: 'quickstart', version: 'v1', description: 'Guide for connecting to IntelGraph MCP' }
];

startPrewarmManager(TOOL_MANIFEST.map((t) => t.name));

export function registerApi(app: FastifyInstance) {
  app.post('/v1/session', async (req, reply) => {
    const body = z.object({ toolClass: z.string(), caps: z.array(z.string()).default([]) }).parse(req.body);
    const tenant = (req.headers['x-tenant-id'] as string) ?? 'demo';
    const purpose = (req.headers['x-purpose'] as string) ?? 'ops';
    await authorize(req.headers.authorization, {
      action: 'allocate',
      tenant,
      toolClass: body.toolClass,
      capabilityScopes: body.caps,
      purpose
    });
    const session = await scheduler.allocate(body.toolClass);
    publish(session.id, { event: 'session.ready', data: JSON.stringify({ sessionId: session.id, toolClass: session.vm.toolClass }), recordingId: session.recordingId });
    emitFrame('out', 'jsonrpc', { 'mcp.session.id': session.id, 'mcp.session.toolClass': session.vm.toolClass, 'mcp.event': 'session.created' });
    void recordEvent(session.recordingId, 'out', 'jsonrpc', { event: 'session.created', toolClass: session.vm.toolClass });
    return reply.code(201).send({
      id: session.id,
      toolClass: session.vm.toolClass,
      transport: session.transport,
      createdAt: session.createdAt
    });
  });

  app.post('/v1/session/:id/invoke', async (req, reply) => {
    const params = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ fn: z.string(), args: z.any() }).parse(req.body);
    const session = scheduler.get(params.id);
    void recordEvent(session?.recordingId, 'in', 'jsonrpc', { fn: body.fn, args: body.args });
    const result = await scheduler.invoke(params.id, body.fn, body.args);
    publish(params.id, { event: 'session.invoke', data: JSON.stringify({ sessionId: params.id, fn: body.fn, result }), recordingId: session?.recordingId });
    emitFrame('out', 'jsonrpc', { 'mcp.session.id': params.id, 'mcp.invoke.fn': body.fn });
    void recordEvent(session?.recordingId, 'out', 'jsonrpc', { fn: body.fn, result });
    return reply.send(result);
  });

  app.delete('/v1/session/:id', async (req, reply) => {
    const params = z.object({ id: z.string() }).parse(req.params);
    const session = scheduler.get(params.id);
    await scheduler.release(params.id);
    publish(params.id, { event: 'session.closed', data: JSON.stringify({ sessionId: params.id }), recordingId: session?.recordingId });
    emitFrame('out', 'jsonrpc', { 'mcp.session.id': params.id, 'mcp.event': 'session.closed' });
    void recordEvent(session?.recordingId, 'out', 'jsonrpc', { event: 'session.closed' });
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
      return reply.code(400).send(jsonRpcError(null, -32600, 'Invalid Request'));
    }

    const rpc = body as Record<string, unknown>;
    if (rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
      return reply.code(400).send(jsonRpcError(rpc.id ?? null, -32600, 'Invalid Request'));
    }

    const id = rpc.id ?? null;
    if (rpc.method === 'mcp.ping') {
      if (rpc.params !== undefined && typeof rpc.params !== 'object') {
        const error = jsonRpcError(id, -32602, 'Invalid params');
        void recordEvent(undefined, 'in', 'jsonrpc', rpc);
        void recordEvent(undefined, 'out', 'jsonrpc', error);
        return reply.code(400).send(error);
      }
      emitFrame('in', 'jsonrpc', { 'rpc.method': rpc.method, 'rpc.id': id ?? 'null' });
      void recordEvent(undefined, 'in', 'jsonrpc', rpc);
      const response = { jsonrpc: '2.0', id, result: { ok: true } };
      void recordEvent(undefined, 'out', 'jsonrpc', response);
      return reply.send(response);
    }

    const invokePayload = z
      .object({
        toolClass: z.string().optional(),
        args: z.any().optional(),
        sessionId: z.string().optional(),
        keepAlive: z.boolean().optional(),
        caps: z.array(z.string()).optional()
      })
      .parse(rpc.params ?? {});

    let session = invokePayload.sessionId ? scheduler.get(invokePayload.sessionId) ?? undefined : undefined;
    let created = false;
    if (!session) {
      if (invokePayload.caps) {
        await authorize(req.headers.authorization, {
          action: 'allocate',
          tenant: (req.headers['x-tenant-id'] as string) ?? 'demo',
          toolClass: invokePayload.toolClass ?? rpc.method,
          capabilityScopes: invokePayload.caps,
          purpose: (req.headers['x-purpose'] as string) ?? 'ops'
        });
      }
      session = await scheduler.allocate(invokePayload.toolClass ?? rpc.method);
      publish(session.id, {
        event: 'session.ready',
        data: JSON.stringify({ sessionId: session.id, toolClass: session.vm.toolClass }),
        recordingId: session.recordingId
      });
      created = true;
    }

    const args = invokePayload.args ?? {};
    emitFrame('in', 'jsonrpc', {
      'rpc.method': rpc.method,
      'rpc.id': id ?? 'null',
      'mcp.session.id': session.id
    });
    void recordEvent(session.recordingId, 'in', 'jsonrpc', { method: rpc.method, args });

    try {
      await authorize(req.headers.authorization, {
        action: 'invoke',
        tenant: (req.headers['x-tenant-id'] as string) ?? 'demo',
        toolClass: session.vm.toolClass,
        capabilityScopes: invokePayload.caps,
        purpose: (req.headers['x-purpose'] as string) ?? 'ops'
      });
      const result = await scheduler.invoke(session.id, rpc.method, args);
      publish(session.id, {
        event: 'session.invoke',
        data: JSON.stringify({ sessionId: session.id, fn: rpc.method, result }),
        recordingId: session.recordingId
      });
      emitFrame('out', 'jsonrpc', { 'mcp.session.id': session.id, 'mcp.invoke.fn': rpc.method });
      void recordEvent(session.recordingId, 'out', 'jsonrpc', { method: rpc.method, result });
      const response = { jsonrpc: '2.0', id, result };
      if (created && !invokePayload.keepAlive) {
        await scheduler.release(session.id);
      }
      return reply.send(response);
    } catch (error) {
      const err = jsonRpcError(id, -32000, (error as Error).message ?? 'invoke failed');
      void recordEvent(session.recordingId, 'out', 'jsonrpc', err);
      if (created) await scheduler.release(session.id);
      return reply.code(500).send(err);
    }
  });
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message }
  };
}
