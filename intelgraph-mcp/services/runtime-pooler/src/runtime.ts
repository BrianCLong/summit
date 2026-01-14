import { z } from 'zod';
import { SchedulerLike, Session } from './scheduler';
import { authorize, PolicyDecision } from './authz';
import { emitFrame } from './telemetry';
import { recordEvent } from './replay-client';
import { createTranscriptHash } from './utils/transcript';

export const TOOL_MANIFEST = [
  {
    name: 'echo',
    description: 'Echoes input payloads using the runtime sandbox',
    scopes: ['read', 'write'],
  },
  { name: 'ping', description: 'Liveness check utility', scopes: ['read'] },
];

export const RESOURCE_MANIFEST = [
  { name: 'health', description: 'Runtime health snapshot', version: 'v1' },
];

export const PROMPT_MANIFEST = [
  {
    name: 'quickstart',
    version: 'v1',
    description: 'Guide for connecting to IntelGraph MCP',
  },
];

export type RuntimeContext = {
  authorization?: string;
  tenant?: string;
  purpose?: string;
  capabilityScopes?: string[];
};

export type RuntimeDeps = {
  scheduler: SchedulerLike;
};

export type InvokeInput = {
  method: string;
  args: unknown;
  sessionId?: string;
  toolClass?: string;
  keepAlive?: boolean;
  authorizeAllocate?: boolean;
  transport: Session['transport'];
  context: RuntimeContext;
};

export type InvokeResult = {
  result: unknown;
  session: Session;
  created: boolean;
  policyDecision?: PolicyDecision;
  transcriptHash: string;
};

export type AllocateInput = {
  toolClass: string;
  transport: Session['transport'];
  context: RuntimeContext;
};

export type AllocateResult = {
  session: Session;
  policyDecision?: PolicyDecision;
  transcriptHash: string;
};

export async function allocateSession(
  deps: RuntimeDeps,
  input: AllocateInput,
): Promise<AllocateResult> {
  const { toolClass, transport, context } = input;
  const policyDecision = await maybeAuthorize(context, {
    action: 'allocate',
    toolClass,
  });
  const session = await deps.scheduler.allocate(toolClass, transport);
  const transcriptHash = createTranscriptHash({
    event: 'session.created',
    sessionId: session.id,
    toolClass,
    policyReceipt: policyDecision?.receipt,
  });
  emitFrame('out', transportChannel(transport), {
    'mcp.session.id': session.id,
    'mcp.session.toolClass': session.vm.toolClass,
    'mcp.event': 'session.created',
    'mcp.transcript.hash': transcriptHash,
  });
  recordEvent(session.recordingId, 'out', transportChannel(transport), {
    event: 'session.created',
    toolClass,
    policyReceipt: policyDecision?.receipt,
    transcriptHash,
  });
  return { session, policyDecision, transcriptHash };
}

export async function invokeSession(
  deps: RuntimeDeps,
  input: InvokeInput,
): Promise<InvokeResult> {
  const {
    method,
    args,
    sessionId,
    toolClass,
    keepAlive,
    authorizeAllocate,
    transport,
    context,
  } = input;
  const { session, created } = await getOrCreateSession(deps, {
    sessionId,
    toolClass: toolClass ?? method,
    transport,
    context,
    authorizeAllocate: authorizeAllocate ?? true,
  });

  emitFrame('in', transportChannel(transport), {
    'rpc.method': method,
    'mcp.session.id': session.id,
  });
  recordEvent(session.recordingId, 'in', transportChannel(transport), {
    method,
    args,
  });

  const policyDecision = await maybeAuthorize(context, {
    action: 'invoke',
    toolClass: session.vm.toolClass,
  });

  const result = await deps.scheduler.invoke(session.id, method, args);
  const transcriptHash = createTranscriptHash({
    event: 'session.invoke',
    sessionId: session.id,
    method,
    result,
    policyReceipt: policyDecision?.receipt,
  });

  emitFrame('out', transportChannel(transport), {
    'mcp.session.id': session.id,
    'mcp.invoke.fn': method,
    'mcp.transcript.hash': transcriptHash,
  });
  recordEvent(session.recordingId, 'out', transportChannel(transport), {
    method,
    result,
    policyReceipt: policyDecision?.receipt,
    transcriptHash,
  });

  if (created && !keepAlive) {
    await deps.scheduler.release(session.id);
  }

  return { result, session, created, policyDecision, transcriptHash };
}

export async function releaseSession(
  deps: RuntimeDeps,
  sessionId: string,
  transport: Session['transport'],
): Promise<void> {
  const session = deps.scheduler.get(sessionId);
  await deps.scheduler.release(sessionId);
  const transcriptHash = createTranscriptHash({
    event: 'session.closed',
    sessionId,
  });
  emitFrame('out', transportChannel(transport), {
    'mcp.session.id': sessionId,
    'mcp.event': 'session.closed',
    'mcp.transcript.hash': transcriptHash,
  });
  recordEvent(session?.recordingId, 'out', transportChannel(transport), {
    event: 'session.closed',
    transcriptHash,
  });
}

export function parseJsonRpc(body: unknown) {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: jsonRpcError(null, -32600, 'Invalid Request') };
  }

  const rpc = body as Record<string, unknown>;
  if (rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
    return {
      ok: false,
      error: jsonRpcError(rpc.id ?? null, -32600, 'Invalid Request'),
    };
  }

  return { ok: true as const, rpc };
}

export function parseInvokeParams(params: unknown) {
  return z
    .object({
      toolClass: z.string().optional(),
      args: z.any().optional(),
      sessionId: z.string().optional(),
      keepAlive: z.boolean().optional(),
      caps: z.array(z.string()).optional(),
    })
    .parse(params ?? {});
}

export function jsonRpcError(id: unknown, code: number, message: string) {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  };
}

export function transportChannel(transport: Session['transport']) {
  switch (transport) {
    case 'grpc':
      return 'grpc';
    case 'stdio':
      return 'stdio';
    case 'http+sse':
    default:
      return 'jsonrpc';
  }
}

async function getOrCreateSession(
  deps: RuntimeDeps,
  input: {
    sessionId?: string;
    toolClass: string;
    transport: Session['transport'];
    context: RuntimeContext;
    authorizeAllocate: boolean;
  },
): Promise<{ session: Session; created: boolean }> {
  const { sessionId, toolClass, transport, context, authorizeAllocate } = input;
  let session = sessionId ? deps.scheduler.get(sessionId) : undefined;
  let created = false;

  if (!session) {
    if (authorizeAllocate) {
      await maybeAuthorize(context, {
        action: 'allocate',
        toolClass,
      });
    }
    session = await deps.scheduler.allocate(toolClass, transport);
    created = true;
  }

  return { session, created };
}

async function maybeAuthorize(
  context: RuntimeContext,
  input: { action: 'allocate' | 'invoke' | 'stream'; toolClass?: string },
) {
  return authorize(context.authorization, {
    action: input.action,
    tenant: context.tenant ?? 'demo',
    toolClass: input.toolClass,
    capabilityScopes: context.capabilityScopes,
    purpose: context.purpose ?? 'ops',
  });
}
