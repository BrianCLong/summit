import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SchedulerLike } from './scheduler';
import { publish } from './transport/httpSse';
import { emitFrame } from './telemetry';
import { recordEvent } from './replay-client';
import { startPrewarmManager } from './vm-pool';
import {
  allocateSession,
  invokeSession,
  jsonRpcError,
  parseInvokeParams,
  parseJsonRpc,
  PROMPT_MANIFEST,
  RESOURCE_MANIFEST,
  releaseSession,
  TOOL_MANIFEST,
} from './runtime';
import { createTranscriptHash } from './utils/transcript';

startPrewarmManager(TOOL_MANIFEST.map((t) => t.name));

export function registerApi(
  app: FastifyInstance,
  deps: { scheduler: SchedulerLike },
) {
  app.post('/v1/session', async (req, reply) => {
    const body = z
      .object({ toolClass: z.string(), caps: z.array(z.string()).default([]) })
      .parse(req.body);
    const context = requestContext(req.headers, body.caps);
    const { session, policyDecision, transcriptHash } = await allocateSession(
      deps,
      {
        toolClass: body.toolClass,
        transport: 'http+sse',
        context,
      },
    );
    publish(session.id, {
      event: 'session.ready',
      data: JSON.stringify({
        sessionId: session.id,
        toolClass: session.vm.toolClass,
      }),
      recordingId: session.recordingId,
    });

    setEvidenceHeaders(reply, policyDecision?.receipt, transcriptHash);

    return reply.code(201).send({
      id: session.id,
      toolClass: session.vm.toolClass,
      transport: session.transport,
      createdAt: session.createdAt,
    });
  });

  app.post('/v1/session/:id/invoke', async (req, reply) => {
    const params = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ fn: z.string(), args: z.any() }).parse(req.body);
    const context = requestContext(req.headers);
    const { result, session, policyDecision, transcriptHash } =
      await invokeSession(deps, {
        method: body.fn,
        args: body.args,
        sessionId: params.id,
        authorizeAllocate: false,
        transport: 'http+sse',
        context,
      });
    publish(params.id, {
      event: 'session.invoke',
      data: JSON.stringify({ sessionId: params.id, fn: body.fn, result }),
      recordingId: session.recordingId,
    });

    setEvidenceHeaders(reply, policyDecision?.receipt, transcriptHash);

    return reply.send(result);
  });

  app.delete('/v1/session/:id', async (req, reply) => {
    const params = z.object({ id: z.string() }).parse(req.params);
    const session = deps.scheduler.get(params.id);
    await releaseSession(deps, params.id, 'http+sse');
    publish(params.id, {
      event: 'session.closed',
      data: JSON.stringify({ sessionId: params.id }),
      recordingId: session?.recordingId,
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
    const parsed = parseJsonRpc(req.body);
    if (!parsed.ok) {
      return reply.code(400).send(parsed.error);
    }

    const { rpc } = parsed;
    const id = rpc.id ?? null;
    if (rpc.method === 'mcp.ping') {
      if (rpc.params !== undefined && typeof rpc.params !== 'object') {
        const error = jsonRpcError(id, -32602, 'Invalid params');
        void recordEvent(undefined, 'in', 'jsonrpc', rpc);
        void recordEvent(undefined, 'out', 'jsonrpc', error);
        return reply.code(400).send(error);
      }
      emitFrame('in', 'jsonrpc', {
        'rpc.method': rpc.method,
        'rpc.id': id ?? 'null',
      });
      void recordEvent(undefined, 'in', 'jsonrpc', rpc);
      const response = { jsonrpc: '2.0', id, result: { ok: true } };
      const transcriptHash = createTranscriptHash(response);
      void recordEvent(undefined, 'out', 'jsonrpc', {
        ...response,
        transcriptHash,
      });
      return reply.send(response);
    }

    const invokePayload = parseInvokeParams(rpc.params ?? {});
    const context = requestContext(req.headers, invokePayload.caps);

    try {
      const { result, session, created, policyDecision, transcriptHash } =
        await invokeSession(deps, {
          method: rpc.method,
          args: invokePayload.args ?? {},
          sessionId: invokePayload.sessionId,
          toolClass: invokePayload.toolClass,
          keepAlive: invokePayload.keepAlive,
          authorizeAllocate: Boolean(invokePayload.caps?.length),
          transport: 'http+sse',
          context,
        });

      if (created) {
        publish(session.id, {
          event: 'session.ready',
          data: JSON.stringify({
            sessionId: session.id,
            toolClass: session.vm.toolClass,
          }),
          recordingId: session.recordingId,
        });
      }

      publish(session.id, {
        event: 'session.invoke',
        data: JSON.stringify({ sessionId: session.id, fn: rpc.method, result }),
        recordingId: session.recordingId,
      });

      const response = { jsonrpc: '2.0', id, result };
      setEvidenceHeaders(reply, policyDecision?.receipt, transcriptHash);
      return reply.send(response);
    } catch (error) {
      const err = jsonRpcError(
        id,
        -32000,
        (error as Error).message ?? 'invoke failed',
      );
      void recordEvent(undefined, 'out', 'jsonrpc', err);
      return reply.code(500).send(err);
    }
  });
}

function requestContext(
  headers: Record<string, unknown>,
  capabilityScopes?: string[],
) {
  return {
    authorization: headers.authorization as string | undefined,
    tenant: (headers['x-tenant-id'] as string) ?? 'demo',
    purpose: (headers['x-purpose'] as string) ?? 'ops',
    capabilityScopes,
  };
}

function setEvidenceHeaders(
  reply: { header: (key: string, value: string) => void },
  receipt: unknown,
  transcriptHash: string,
) {
  if (receipt) {
    reply.header('x-ig-policy-receipt', JSON.stringify(receipt));
  }
  reply.header('x-ig-transcript-hash', transcriptHash);
}
