import fs from 'node:fs';
import { promisify } from 'node:util';
import {
  Server,
  ServerCredentials,
  ServerUnaryCall,
  ServerDuplexStream,
  sendUnaryData,
  status,
  Metadata,
} from '@grpc/grpc-js';
import { context, propagation, trace } from '@opentelemetry/api';
import {
  allocateSession,
  invokeSession,
  PROMPT_MANIFEST,
  RESOURCE_MANIFEST,
  TOOL_MANIFEST,
  releaseSession,
} from '../../runtime';
import { SchedulerLike } from '../../scheduler';
import { loadMcpProto } from './proto';
import { createTranscriptHash } from '../../utils/transcript';

export type GrpcServerConfig = {
  host: string;
  port: number;
  tlsEnabled: boolean;
  tlsKeyPath?: string;
  tlsCertPath?: string;
  tlsCaPath?: string;
  tlsRequireClientCert: boolean;
  maxInFlight: number;
  defaultDeadlineMs: number;
};

export type GrpcServerDeps = {
  scheduler: SchedulerLike;
};

export type GrpcServerState = {
  maxInFlightObserved: number;
};

export async function startGrpcServer(
  deps: GrpcServerDeps,
  config: GrpcServerConfig,
): Promise<{ server: Server; state: GrpcServerState; port: number }> {
  const server = new Server();
  const state: GrpcServerState = { maxInFlightObserved: 0 };

  const definition = loadMcpProto() as any;
  const service = definition.intelgraph.mcp.transport.v1.McpTransport.service;

  const wrapUnary = withUnarySpan(config.defaultDeadlineMs);

  server.addService(service, {
    Initialize: wrapUnary('Initialize', async (call, callback) => {
      const response = {
        server_name: 'intelgraph-runtime-pooler',
        server_version: '2.0.0',
        transports: ['http+sse', 'grpc'],
        metadata: { version: 'v1' },
      };
      callback(null, response, buildMetadata({
        transcriptHash: createTranscriptHash(response),
        traceId: spanTraceId(),
      }));
    }),
    ListTools: wrapUnary('ListTools', async (_call, callback) => {
      callback(null, { tools: TOOL_MANIFEST }, buildMetadata({
        transcriptHash: createTranscriptHash(TOOL_MANIFEST),
        traceId: spanTraceId(),
      }));
    }),
    ListResources: wrapUnary('ListResources', async (_call, callback) => {
      callback(null, { resources: RESOURCE_MANIFEST }, buildMetadata({
        transcriptHash: createTranscriptHash(RESOURCE_MANIFEST),
        traceId: spanTraceId(),
      }));
    }),
    ListPrompts: wrapUnary('ListPrompts', async (_call, callback) => {
      callback(null, { prompts: PROMPT_MANIFEST }, buildMetadata({
        transcriptHash: createTranscriptHash(PROMPT_MANIFEST),
        traceId: spanTraceId(),
      }));
    }),
    Ping: wrapUnary('Ping', async (call, callback) => {
      const response = { id: call.request.id ?? '', ok: true };
      callback(null, response, buildMetadata({
        transcriptHash: createTranscriptHash(response),
        traceId: spanTraceId(),
      }));
    }),
    Invoke: wrapUnary('Invoke', async (call, callback) => {
      const context = requestContext(call.metadata, call.request.capability_scopes);
      try {
        const invokeResult = await invokeSession(
          { scheduler: deps.scheduler },
          {
            method: call.request.tool_name,
            args: call.request.args ?? {},
            sessionId: call.request.session_id || undefined,
            toolClass: call.request.tool_class || undefined,
            keepAlive: call.request.keep_alive ?? false,
            authorizeAllocate: true,
            transport: 'grpc',
            context,
          },
        );
        const response = {
          id: call.request.id ?? '',
          result: invokeResult.result ?? {},
          session_id: invokeResult.session.id,
          metadata: buildResponseMetadata(invokeResult.policyDecision?.receipt),
        };
        callback(null, response, buildMetadata({
          receipt: invokeResult.policyDecision?.receipt,
          transcriptHash: invokeResult.transcriptHash,
          traceId: spanTraceId(),
        }));
      } catch (error) {
        callback(toGrpcError(error), null);
      }
    }),
    Release: wrapUnary('Release', async (call, callback) => {
      try {
        await releaseSession({ scheduler: deps.scheduler }, call.request.session_id, 'grpc');
        const response = { ok: true };
        callback(null, response, buildMetadata({
          transcriptHash: createTranscriptHash(response),
          traceId: spanTraceId(),
        }));
      } catch (error) {
        callback(toGrpcError(error), null);
      }
    }),
    Allocate: wrapUnary('Allocate', async (call, callback) => {
      const context = requestContext(
        call.metadata,
        call.request.capability_scopes,
      );
      try {
        const { session, policyDecision, transcriptHash } = await allocateSession(
          { scheduler: deps.scheduler },
          {
            toolClass: call.request.tool_class,
            transport: 'grpc',
            context,
          },
        );
        const response = {
          session_id: session.id,
          tool_class: session.vm.toolClass,
          transport: session.transport,
          created_at: session.createdAt,
          metadata: buildResponseMetadata(policyDecision?.receipt),
        };
        callback(null, response, buildMetadata({
          receipt: policyDecision?.receipt,
          transcriptHash,
          traceId: spanTraceId(),
        }));
      } catch (error) {
        callback(toGrpcError(error), null);
      }
    }),
    Call: wrapUnary('Call', async (call, callback) => {
      const request = call.request;
      if (request.method === 'mcp.ping') {
        const response = { id: request.id ?? '', result: { ok: true } };
        callback(null, response, buildMetadata({
          transcriptHash: createTranscriptHash(response),
          traceId: spanTraceId(),
        }));
        return;
      }

      const context = requestContext(call.metadata, request.params?.caps as string[]);
      try {
        const invokeResult = await invokeSession(
          { scheduler: deps.scheduler },
          {
            method: request.method,
            args: (request.params as { args?: unknown })?.args ?? {},
            sessionId: request.session?.session_id ?? undefined,
            toolClass: (request.params as { toolClass?: string })?.toolClass,
            keepAlive: (request.params as { keepAlive?: boolean })?.keepAlive,
            authorizeAllocate: Boolean((request.params as { caps?: string[] })?.caps?.length),
            transport: 'grpc',
            context,
          },
        );

        const response = {
          id: request.id ?? '',
          result: invokeResult.result ?? {},
          session: {
            session_id: invokeResult.session.id,
            tool_class: invokeResult.session.vm.toolClass,
            recording_id: invokeResult.session.recordingId ?? '',
          },
          metadata: buildResponseMetadata(invokeResult.policyDecision?.receipt),
        };
        callback(null, response, buildMetadata({
          receipt: invokeResult.policyDecision?.receipt,
          transcriptHash: invokeResult.transcriptHash,
          traceId: spanTraceId(),
        }));
      } catch (error) {
        callback(toGrpcError(error), null);
      }
    }),
    Connect: (call: ServerDuplexStream<any, any>) => {
      let inFlight = 0;
      call.on('data', (request) => {
        inFlight += 1;
        state.maxInFlightObserved = Math.max(state.maxInFlightObserved, inFlight);
        if (inFlight >= config.maxInFlight) {
          call.pause();
        }
        void handleStreamRequest(call, request, deps).finally(() => {
          inFlight -= 1;
          if (call.isPaused() && inFlight < config.maxInFlight) {
            call.resume();
          }
        });
      });
      call.on('end', () => {
        call.end();
      });
    },
  });

  const creds = config.tlsEnabled
    ? ServerCredentials.createSsl(
        config.tlsCaPath ? fs.readFileSync(config.tlsCaPath) : null,
        [
          {
            cert_chain: readFileRequired(config.tlsCertPath, 'MCP_GRPC_TLS_CERT'),
            private_key: readFileRequired(config.tlsKeyPath, 'MCP_GRPC_TLS_KEY'),
          },
        ],
        config.tlsRequireClientCert,
      )
    : ServerCredentials.createInsecure();

  const bindAsync = promisify(server.bindAsync.bind(server));
  const port = await bindAsync(`${config.host}:${config.port}`, creds);
  server.start();
  return { server, state, port };
}

function withUnarySpan(defaultDeadlineMs: number) {
  return (
    name: string,
    handler: (
      call: ServerUnaryCall<any, any>,
      callback: sendUnaryData<any>,
    ) => void,
  ) => {
    return (call: ServerUnaryCall<any, any>, callback: sendUnaryData<any>) => {
      const parent = propagation.extract(
        context.active(),
        call.metadata,
        metadataGetter,
      );
      const span = trace
        .getTracer('mcp-grpc')
        .startSpan(`grpc.${name}`, undefined, parent);
      const spanContext = trace.setSpan(parent, span);
      const deadlineMs = resolveDeadline(call, defaultDeadlineMs);
      let finished = false;
      let timer: NodeJS.Timeout | undefined;
      if (deadlineMs !== undefined) {
        timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          const err = {
            code: status.DEADLINE_EXCEEDED,
            message: 'deadline exceeded',
          } as Error;
          span.recordException(err);
          span.end();
          callback(err, null);
        }, deadlineMs);
      }
      context.with(spanContext, () => {
        handler(call, (err, value, trailer, flags) => {
          if (finished) return;
          finished = true;
          if (timer) clearTimeout(timer);
          if (err) {
            span.recordException(err);
          }
          span.end();
          callback(err, value, trailer, flags);
        });
      });
    };
  };
}

async function handleStreamRequest(
  call: ServerDuplexStream<any, any>,
  request: any,
  deps: GrpcServerDeps,
) {
  const parent = propagation.extract(context.active(), call.metadata, metadataGetter);
  const span = trace
    .getTracer('mcp-grpc')
    .startSpan('grpc.Connect', undefined, parent);
  const spanContext = trace.setSpan(parent, span);
  return context.with(spanContext, async () => {
    try {
      if (request.method === 'mcp.ping') {
        call.write({
          id: request.id ?? '',
          result: { ok: true },
          metadata: { trace_id: span.spanContext().traceId },
        });
        return;
      }

      const invokeResult = await invokeSession(
        { scheduler: deps.scheduler },
        {
          method: request.method,
          args: (request.params as { args?: unknown })?.args ?? {},
          sessionId: request.session?.session_id ?? undefined,
          toolClass: (request.params as { toolClass?: string })?.toolClass,
          keepAlive: (request.params as { keepAlive?: boolean })?.keepAlive,
          authorizeAllocate: Boolean((request.params as { caps?: string[] })?.caps?.length),
          transport: 'grpc',
          context: requestContext(call.metadata, request.params?.caps as string[]),
        },
      );

      call.write({
        id: request.id ?? '',
        result: invokeResult.result ?? {},
        session: {
          session_id: invokeResult.session.id,
          tool_class: invokeResult.session.vm.toolClass,
          recording_id: invokeResult.session.recordingId ?? '',
        },
        metadata: buildResponseMetadata(invokeResult.policyDecision?.receipt),
      });
    } catch (error) {
      call.emit('error', toGrpcError(error));
    } finally {
      span.end();
    }
  });
}

function requestContext(metadata: Metadata, capabilityScopes?: string[]) {
  return {
    authorization: getMetadataValue(metadata, 'authorization'),
    tenant: getMetadataValue(metadata, 'x-tenant-id') ?? 'demo',
    purpose: getMetadataValue(metadata, 'x-purpose') ?? 'ops',
    capabilityScopes,
  };
}

function getMetadataValue(metadata: Metadata, key: string) {
  const value = metadata.get(key);
  if (!value.length) return undefined;
  return String(value[0]);
}

function metadataGetter(metadata: Metadata, key: string) {
  const value = metadata.get(key);
  return value.length ? [String(value[0])] : [];
}

function buildMetadata(input: {
  receipt?: unknown;
  transcriptHash: string;
  traceId?: string;
}) {
  const metadata = new Metadata();
  metadata.set('x-ig-transcript-hash', input.transcriptHash);
  if (input.receipt) {
    metadata.set('x-ig-policy-receipt', JSON.stringify(input.receipt));
  }
  if (input.traceId) {
    metadata.set('x-trace-id', input.traceId);
  }
  return metadata;
}

function buildResponseMetadata(receipt?: unknown) {
  return receipt ? { policy_receipt: JSON.stringify(receipt) } : {};
}

function spanTraceId() {
  return trace.getSpan(context.active())?.spanContext().traceId;
}

function toGrpcError(error: unknown) {
  const message = (error as Error).message ?? 'grpc error';
  let code = status.UNKNOWN;
  if (message.includes('unauthorized')) {
    code = status.UNAUTHENTICATED;
  } else if (message.includes('forbidden')) {
    code = status.PERMISSION_DENIED;
  } else if (message.includes('not found')) {
    code = status.NOT_FOUND;
  } else if (message.includes('invalid')) {
    code = status.INVALID_ARGUMENT;
  }

  const metadata = new Metadata();
  metadata.set(
    'x-mcp-error',
    JSON.stringify({ code, message, details: 'grpc' }),
  );

  return { code, message, metadata } as Error;
}

function resolveDeadline(
  call: ServerUnaryCall<any, any>,
  defaultDeadlineMs: number,
) {
  const deadline = call.getDeadline?.();
  if (deadline instanceof Date) {
    const remaining = deadline.getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  }
  return defaultDeadlineMs > 0 ? defaultDeadlineMs : undefined;
}

function readFileRequired(pathValue: string | undefined, envKey: string) {
  if (!pathValue) {
    throw new Error(`missing ${envKey}`);
  }
  return fs.readFileSync(pathValue);
}
