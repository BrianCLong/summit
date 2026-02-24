import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Scheduler } from './scheduler';
import { AuthorizationError, authorize } from './authz';
import { publish } from './transport/httpSse';
import { emitFrame } from './telemetry';
import { recordEvent } from './replay-client';
import { startPrewarmManager } from './vm-pool';
import {
  rpcMethodSchema,
  sessionIdSchema,
  toolClassSchema,
  parseRpcMethod,
} from './validation';

const scheduler = new Scheduler();
const sessionCreateBodySchema = z
  .object({ toolClass: toolClassSchema, caps: z.array(z.string()).default([]) })
  .strict();
const sessionInvokeBodySchema = z
  .object({ fn: rpcMethodSchema, args: z.unknown() })
  .strict();
const jsonRpcInvokePayloadSchema = z
  .object({
    toolClass: toolClassSchema.optional(),
    args: z.unknown().optional(),
    sessionId: sessionIdSchema.optional(),
    keepAlive: z.boolean().optional(),
    caps: z.array(z.string()).optional(),
  })
  .strict();

const TOOL_MANIFEST = [
  {
    name: 'echo',
    description: 'Echoes input payloads using the runtime sandbox',
    scopes: ['read', 'write'],
  },
  { name: 'ping', description: 'Liveness check utility', scopes: ['read'] },
];
const TOOL_NAMES = new Set(TOOL_MANIFEST.map((tool) => tool.name));

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

startPrewarmManager(TOOL_MANIFEST.map((t) => t.name));

export function registerApi(app: FastifyInstance) {
  app.post('/v1/session', async (req, reply) => {
    const body = sessionCreateBodySchema.parse(req.body);
    if (!TOOL_NAMES.has(body.toolClass)) {
      return reply.code(400).send({
        error: `Unknown toolClass "${body.toolClass}"`,
      });
    }
    const tenant = (req.headers['x-tenant-id'] as string) ?? 'demo';
    const purpose = (req.headers['x-purpose'] as string) ?? 'ops';
    try {
      await authorize(req.headers.authorization, {
        action: 'allocate',
        tenant,
        toolClass: body.toolClass,
        capabilityScopes: body.caps,
        purpose,
      });
    } catch (error) {
      const authError = getAuthorizationError(error);
      if (authError) {
        return reply.code(authError.statusCode).send({ error: authError.message });
      }
      throw error;
    }
    const session = await scheduler.allocate(body.toolClass);
    publish(session.id, {
      event: 'session.ready',
      data: JSON.stringify({
        sessionId: session.id,
        toolClass: session.vm.toolClass,
      }),
      recordingId: session.recordingId,
    });
    emitFrame('out', 'jsonrpc', {
      'mcp.session.id': session.id,
      'mcp.session.toolClass': session.vm.toolClass,
      'mcp.event': 'session.created',
    });
    void recordEvent(session.recordingId, 'out', 'jsonrpc', {
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
    const params = z.object({ id: sessionIdSchema }).parse(req.params);
    const body = sessionInvokeBodySchema.parse(req.body);
    const session = scheduler.get(params.id);
    if (!session) {
      return reply.code(404).send({ error: 'session not found' });
    }
    if (body.fn !== session.vm.toolClass) {
      return reply.code(400).send({
        error: `Function "${body.fn}" is not allowed for session toolClass "${session.vm.toolClass}"`,
      });
    }
    try {
      await authorize(req.headers.authorization, {
        action: 'invoke',
        tenant: (req.headers['x-tenant-id'] as string) ?? 'demo',
        toolClass: session.vm.toolClass,
        capabilityScopes: [],
        purpose: (req.headers['x-purpose'] as string) ?? 'ops',
      });
    } catch (error) {
      const authError = getAuthorizationError(error);
      if (authError) {
        return reply.code(authError.statusCode).send({ error: authError.message });
      }
      throw error;
    }
    void recordEvent(session?.recordingId, 'in', 'jsonrpc', {
      fn: body.fn,
      args: body.args,
    });
    const result = await scheduler.invoke(params.id, body.fn, body.args);
    publish(params.id, {
      event: 'session.invoke',
      data: JSON.stringify({ sessionId: params.id, fn: body.fn, result }),
      recordingId: session?.recordingId,
    });
    emitFrame('out', 'jsonrpc', {
      'mcp.session.id': params.id,
      'mcp.invoke.fn': body.fn,
    });
    void recordEvent(session?.recordingId, 'out', 'jsonrpc', {
      fn: body.fn,
      result,
    });
    return reply.send(result);
  });

  app.delete('/v1/session/:id', async (req, reply) => {
    const params = z.object({ id: sessionIdSchema }).parse(req.params);
    const session = scheduler.get(params.id);
    if (session) {
      try {
        await authorize(req.headers.authorization, {
          action: 'invoke',
          tenant: (req.headers['x-tenant-id'] as string) ?? 'demo',
          toolClass: session.vm.toolClass,
          capabilityScopes: [],
          purpose: (req.headers['x-purpose'] as string) ?? 'ops',
        });
      } catch (error) {
        const authError = getAuthorizationError(error);
        if (authError) {
          return reply
            .code(authError.statusCode)
            .send({ error: authError.message });
        }
        throw error;
      }
    }
    await scheduler.release(params.id);
    publish(params.id, {
      event: 'session.closed',
      data: JSON.stringify({ sessionId: params.id }),
      recordingId: session?.recordingId,
    });
    emitFrame('out', 'jsonrpc', {
      'mcp.session.id': params.id,
      'mcp.event': 'session.closed',
    });
    void recordEvent(session?.recordingId, 'out', 'jsonrpc', {
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
    if (Array.isArray(body)) {
      const error = jsonRpcError(null, -32600, 'Batch not supported');
      return reply.code(501).send(error);
    }

    if (typeof body !== 'object' || body === null) {
      return reply
        .code(400)
        .send(jsonRpcError(null, -32600, 'Invalid Request'));
    }

    const rpc = body as Record<string, unknown>;
    let method: string;
    try {
      method = parseRpcMethod(rpc.method);
    } catch {
      return reply
        .code(400)
        .send(jsonRpcError(rpc.id ?? null, -32600, 'Invalid Request'));
    }

    if (rpc.jsonrpc !== '2.0') {
      return reply
        .code(400)
        .send(jsonRpcError(rpc.id ?? null, -32600, 'Invalid Request'));
    }

    const id = rpc.id ?? null;
    if (method === 'mcp.ping') {
      if (rpc.params !== undefined && typeof rpc.params !== 'object') {
        const error = jsonRpcError(id, -32602, 'Invalid params');
        void recordEvent(undefined, 'in', 'jsonrpc', rpc);
        void recordEvent(undefined, 'out', 'jsonrpc', error);
        return reply.code(400).send(error);
      }
      emitFrame('in', 'jsonrpc', {
        'rpc.method': method,
        'rpc.id': id ?? 'null',
      });
      void recordEvent(undefined, 'in', 'jsonrpc', rpc);
      const response = { jsonrpc: '2.0', id, result: { ok: true } };
      void recordEvent(undefined, 'out', 'jsonrpc', response);
      return reply.send(response);
    }

    const invokePayloadResult = jsonRpcInvokePayloadSchema.safeParse(
      rpc.params ?? {},
    );
    if (!invokePayloadResult.success) {
      const error = jsonRpcError(id, -32602, 'Invalid params');
      void recordEvent(undefined, 'in', 'jsonrpc', rpc);
      void recordEvent(undefined, 'out', 'jsonrpc', error);
      return reply.code(400).send(error);
    }
    const invokePayload = invokePayloadResult.data;

    let session = invokePayload.sessionId
      ? (scheduler.get(invokePayload.sessionId) ?? undefined)
      : undefined;
    let created = false;
    const requestedToolClass = invokePayload.toolClass ?? method;
    if (!TOOL_NAMES.has(requestedToolClass)) {
      const err = jsonRpcError(
        id,
        -32601,
        `Method or tool not found: ${requestedToolClass}`,
      );
      void recordEvent(undefined, 'in', 'jsonrpc', rpc);
      void recordEvent(undefined, 'out', 'jsonrpc', err);
      return reply.code(400).send(err);
    }
    if (!session) {
      if (invokePayload.sessionId) {
        const err = jsonRpcError(id, -32001, 'Session not found');
        void recordEvent(undefined, 'in', 'jsonrpc', rpc);
        void recordEvent(undefined, 'out', 'jsonrpc', err);
        return reply.code(404).send(err);
      }
      const resolvedToolClass = requestedToolClass;
      try {
        await authorize(req.headers.authorization, {
          action: 'allocate',
          tenant: (req.headers['x-tenant-id'] as string) ?? 'demo',
          toolClass: resolvedToolClass,
          capabilityScopes: invokePayload.caps ?? [],
          purpose: (req.headers['x-purpose'] as string) ?? 'ops',
        });
      } catch (error) {
        const authFailure = jsonRpcAuthError(id, error);
        if (authFailure) {
          void recordEvent(undefined, 'in', 'jsonrpc', rpc);
          void recordEvent(undefined, 'out', 'jsonrpc', authFailure.payload);
          return reply.code(authFailure.status).send(authFailure.payload);
        }
        throw error;
      }
      session = await scheduler.allocate(resolvedToolClass);
      publish(session.id, {
        event: 'session.ready',
        data: JSON.stringify({
          sessionId: session.id,
          toolClass: session.vm.toolClass,
        }),
        recordingId: session.recordingId,
      });
      created = true;
    }
    if (method !== session.vm.toolClass) {
      const err = jsonRpcError(
        id,
        -32601,
        `Method "${method}" not available for session toolClass "${session.vm.toolClass}"`,
      );
      void recordEvent(session.recordingId, 'out', 'jsonrpc', err);
      if (created) await scheduler.release(session.id);
      return reply.code(400).send(err);
    }

    const args = invokePayload.args ?? {};
    emitFrame('in', 'jsonrpc', {
      'rpc.method': method,
      'rpc.id': id ?? 'null',
      'mcp.session.id': session.id,
    });
    void recordEvent(session.recordingId, 'in', 'jsonrpc', {
      method,
      args,
    });

    try {
      await authorize(req.headers.authorization, {
        action: 'invoke',
        tenant: (req.headers['x-tenant-id'] as string) ?? 'demo',
        toolClass: session.vm.toolClass,
        capabilityScopes: invokePayload.caps ?? [],
        purpose: (req.headers['x-purpose'] as string) ?? 'ops',
      });
      const result = await scheduler.invoke(session.id, method, args);
      publish(session.id, {
        event: 'session.invoke',
        data: JSON.stringify({ sessionId: session.id, fn: method, result }),
        recordingId: session.recordingId,
      });
      emitFrame('out', 'jsonrpc', {
        'mcp.session.id': session.id,
        'mcp.invoke.fn': method,
      });
      void recordEvent(session.recordingId, 'out', 'jsonrpc', {
        method,
        result,
      });
      const response = { jsonrpc: '2.0', id, result };
      if (created && !invokePayload.keepAlive) {
        await scheduler.release(session.id);
      }
      return reply.send(response);
    } catch (error) {
      const authFailure = jsonRpcAuthError(id, error);
      if (authFailure) {
        void recordEvent(session.recordingId, 'out', 'jsonrpc', authFailure.payload);
        if (created) await scheduler.release(session.id);
        return reply.code(authFailure.status).send(authFailure.payload);
      }
      const err = jsonRpcError(
        id,
        -32000,
        (error as Error).message ?? 'invoke failed',
      );
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
    error: { code, message },
  };
}

function getAuthorizationError(error: unknown): AuthorizationError | undefined {
  if (error instanceof AuthorizationError) {
    return error;
  }
  return undefined;
}

function jsonRpcAuthError(
  id: unknown,
  error: unknown,
): { status: number; payload: ReturnType<typeof jsonRpcError> } | undefined {
  const authError = getAuthorizationError(error);
  if (!authError) return undefined;
  if (authError.reason === 'policy_unavailable') {
    return {
      status: authError.statusCode,
      payload: jsonRpcError(id, -32002, authError.message),
    };
  }
  return {
    status: authError.statusCode,
    payload: jsonRpcError(id, -32001, authError.message),
  };
}
