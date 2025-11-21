import { Namespace, Socket } from 'socket.io';
import Redis from 'ioredis';
import pino from 'pino';

const logger = pino();

export interface GraphOperation {
  id: string;
  kind: 'node' | 'edge';
  action: 'set' | 'delete';
  data?: any;
  ts: number;
  meta?: Record<string, any>;
}

export interface GraphSnapshot {
  nodes: any[];
  edges: any[];
  clock: number;
}

class GraphCRDT {
  private nodes = new Map<string, { ts: number; data: any }>();
  private edges = new Map<string, { ts: number; data: any }>();

  apply(op: GraphOperation): boolean {
    const store = op.kind === 'node' ? this.nodes : this.edges;
    const existing = store.get(op.id);
    if (!existing || op.ts >= existing.ts) {
      if (op.action === 'delete') {
        store.delete(op.id);
      } else {
        store.set(op.id, { ts: op.ts, data: op.data });
      }
      return true;
    }
    return false;
  }
  snapshot(): { nodes: any[]; edges: any[] } {
    return {
      nodes: Array.from(this.nodes.values()).map((entry) => entry.data),
      edges: Array.from(this.edges.values()).map((entry) => entry.data),
    };
  }
}

const graphs = new Map<string, { crdt: GraphCRDT; clock: number }>();

function getGraph(graphId: string) {
  let entry = graphs.get(graphId);
  if (!entry) {
    entry = { crdt: new GraphCRDT(), clock: 0 };
    graphs.set(graphId, entry);
  }
  return entry;
}

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

const pub = new Redis(redisOptions);
const sub = pub.duplicate();
let ioRef: Namespace | null = null;

export function initGraphSync(ns: Namespace) {
  ioRef = ns;
  sub.psubscribe('graph:op:*');
  sub.on('pmessage', (_pattern, channel, message) => {
    const graphId = channel.split(':')[2];
    const op: GraphOperation = JSON.parse(message);
    const entry = getGraph(graphId);
    entry.clock = Math.max(entry.clock, op.ts);
    if (entry.crdt.apply(op)) {
      ioRef?.to(`graph:${graphId}`).emit('graph:op', { graphId, op });
    }
  });
  sub.on('error', (err) => logger.error({ err }, 'Redis sub error'));
}

interface RegisterOptions {
  authorize?: (
    graphId: string,
    op: GraphOperation,
    intent: 'mutate' | 'view',
  ) => Promise<boolean> | boolean;
  onApplied?: (graphId: string, op: GraphOperation) => void;
}

export function registerGraphHandlers(
  socket: Socket,
  options: RegisterOptions = {},
) {
  socket.on(
    'graph:op',
    async ({ graphId, op }: { graphId: string; op: GraphOperation }) => {
      if (!graphId || !op) return;
      if (options.authorize) {
        const allowed = await options.authorize(graphId, op, 'mutate');
        if (!allowed) {
          socket.emit('graph:error', {
            graphId,
            reason: 'forbidden',
          });
          return;
        }
      }
      const entry = getGraph(graphId);
      entry.clock = Math.max(entry.clock, op.ts || 0) + 1;
      op.ts = entry.clock;
      if (entry.crdt.apply(op)) {
        socket.to(`graph:${graphId}`).emit('graph:op', { graphId, op });
        pub.publish(`graph:op:${graphId}`, JSON.stringify(op));
        await Promise.resolve(options.onApplied?.(graphId, op));
      }
    },
  );

  socket.on('graph:sync', async ({ graphId }: { graphId: string }) => {
    if (!graphId) return;
    if (options.authorize) {
      const allowed = await options.authorize(
        graphId,
        {
          id: 'sync',
          kind: 'node',
          action: 'set',
          ts: Date.now(),
        },
        'view',
      );
      if (!allowed) {
        socket.emit('graph:error', { graphId, reason: 'forbidden' });
        return;
      }
    }
    const entry = getGraph(graphId);
    const snapshot = entry.crdt.snapshot();
    socket.emit('graph:state', {
      graphId,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      clock: entry.clock,
    });
  });
}

export function getGraphSnapshot(graphId: string): GraphSnapshot {
  const entry = getGraph(graphId);
  const snapshot = entry.crdt.snapshot();
  return { ...snapshot, clock: entry.clock };
}
