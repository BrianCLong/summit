import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import { createServer } from 'node:http';
import { promisify } from 'node:util';
import { Metadata, credentials, loadPackageDefinition } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { startGrpcServer } from '../src/transport/grpc/server';
import type { SchedulerLike, Session } from '../src/scheduler';

const protoPath = path.resolve(__dirname, '../proto/mcp-transport.proto');
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const proto = loadPackageDefinition(packageDefinition) as any;
const TransportClient = proto.intelgraph.mcp.transport.v1.McpTransport;

function createScheduler(): SchedulerLike {
  const sessions = new Map<string, Session>();
  return {
    async allocate(toolClass, transport) {
      const session = {
        id: `sess_${Math.random().toString(16).slice(2)}`,
        vm: { id: 'vm', apiSocket: 'sock', toolClass } as Session['vm'],
        transport: transport ?? 'grpc',
        createdAt: new Date().toISOString(),
      } as Session;
      sessions.set(session.id, session);
      return session;
    },
    async invoke(_sessionId, fn, args) {
      if (fn === 'slow') {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return { fn, args };
    },
    async release(sessionId) {
      sessions.delete(sessionId);
    },
    get(sessionId) {
      return sessions.get(sessionId);
    },
  };
}

async function startOpaServer(allow: boolean) {
  const server = createServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ result: allow }));
  });
  const listen = promisify(server.listen.bind(server));
  await listen(0, '127.0.0.1');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('failed to bind opa server');
  }
  return { server, port: address.port };
}

describe('gRPC transport', () => {
  let client: any;
  let serverHandle: { server: any; port: number; state: any };

  beforeAll(async () => {
    serverHandle = await startGrpcServer(
      { scheduler: createScheduler() },
      {
        host: '127.0.0.1',
        port: 0,
        tlsEnabled: false,
        tlsRequireClientCert: false,
        maxInFlight: 2,
        defaultDeadlineMs: 1000,
      },
    );
    client = new TransportClient(
      `127.0.0.1:${serverHandle.port}`,
      credentials.createInsecure(),
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => serverHandle.server.tryShutdown(() => resolve()));
  });

  it('initializes and lists tools', async () => {
    const init = await new Promise<any>((resolve, reject) => {
      client.Initialize({}, (_err: Error | null, response: any) => {
        if (_err) return reject(_err);
        resolve(response);
      });
    });
    expect(init.server_name).toBe('intelgraph-runtime-pooler');

    const tools = await new Promise<any>((resolve, reject) => {
      client.ListTools({}, (_err: Error | null, response: any) => {
        if (_err) return reject(_err);
        resolve(response);
      });
    });
    expect(tools.tools?.length).toBeGreaterThan(0);
  });

  it('allocates and invokes tools', async () => {
    const alloc = await new Promise<any>((resolve, reject) => {
      const metadata = new Metadata();
      metadata.set('authorization', 'Bearer token');
      client.Allocate(
        { tool_class: 'echo', capability_scopes: ['read'] },
        metadata,
        (_err: Error | null, response: any) => {
          if (_err) return reject(_err);
          resolve(response);
        },
      );
    });

    const invoke = await new Promise<any>((resolve, reject) => {
      const metadata = new Metadata();
      metadata.set('authorization', 'Bearer token');
      client.Invoke(
        {
          id: '1',
          tool_name: 'echo',
          args: { message: 'hi' },
          session_id: alloc.session_id,
          keep_alive: true,
        },
        metadata,
        (_err: Error | null, response: any) => {
          if (_err) return reject(_err);
          resolve(response);
        },
      );
    });

    expect(invoke.result).toBeTruthy();
  });

  it('returns PERMISSION_DENIED when policy blocks', async () => {
    const opa = await startOpaServer(false);
    process.env.OPA_URL = `http://127.0.0.1:${opa.port}`;

    const error = await new Promise<any>((resolve) => {
      const metadata = new Metadata();
      metadata.set('authorization', 'Bearer token');
      client.Invoke(
        {
          id: '2',
          tool_name: 'echo',
          args: {},
          session_id: 'missing',
          keep_alive: true,
        },
        metadata,
        (_err: any) => resolve(_err),
      );
    });

    expect(error.code).toBe(7);
    delete process.env.OPA_URL;
    await new Promise<void>((resolve) => opa.server.close(() => resolve()));
  });

  it('returns DEADLINE_EXCEEDED on timeout', async () => {
    const error = await new Promise<any>((resolve) => {
      const metadata = new Metadata();
      metadata.set('authorization', 'Bearer token');
      client.Invoke(
        {
          id: '3',
          tool_name: 'slow',
          args: {},
          keep_alive: true,
        },
        metadata,
        { deadline: new Date(Date.now() + 5) },
        (_err: any) => resolve(_err),
      );
    });
    expect(error.code).toBe(4);
  });

  it('streams with backpressure', async () => {
    const metadata = new Metadata();
    metadata.set('authorization', 'Bearer token');
    const stream = client.Connect(metadata);
    let received = 0;
    stream.on('data', () => {
      received += 1;
    });

    for (let i = 0; i < 5; i += 1) {
      stream.write({
        id: `${i}`,
        method: 'echo',
        params: { args: { index: i } },
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    stream.end();

    expect(received).toBeGreaterThan(0);
    expect(serverHandle.state.maxInFlightObserved).toBeLessThanOrEqual(2);
  });
});
