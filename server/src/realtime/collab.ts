import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { runCypher } from '../graph/neo4j.js';

type Maybe<T> = T | null | undefined;

interface SocketCtx {
  tenantId: string;
  userId: string;
}

interface GraphNode {
  id: string;
  label?: string;
  type?: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  risk?: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  weight?: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  version: number;
  updatedAt?: number;
  updatedBy?: string;
}

type GraphOperation =
  | { type: 'node:add'; node: GraphNode }
  | { type: 'node:update'; node: Partial<GraphNode> & { id: string } }
  | { type: 'node:remove'; nodeId: string }
  | { type: 'edge:add'; edge: GraphEdge }
  | { type: 'edge:update'; edge: Partial<GraphEdge> & { id: string } }
  | { type: 'edge:remove'; edgeId: string };

interface LockInfo {
  userId: string;
  kind?: string;
  lockedAt: number;
}

const DEFAULT_GRAPH_STATE: GraphState = {
  nodes: [],
  edges: [],
  version: 0,
};

function normalizeNumber(value: Maybe<number>, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeString(value: Maybe<string>, fallback = '') {
  return typeof value === 'string' && value.length ? value : fallback;
}

function normalizeNode(input: Partial<GraphNode>): GraphNode {
  const normalizedId = normalizeString(input.id);
  return {
    id: normalizedId || randomUUID(),
    label: normalizeString(input.label),
    type: normalizeString(input.type, 'entity'),
    x: normalizeNumber(input.x),
    y: normalizeNumber(input.y),
    size: normalizeNumber(input.size, 12),
    color: normalizeString(input.color, '#2563eb'),
    risk: normalizeNumber(input.risk),
    confidence: normalizeNumber(input.confidence),
    metadata: input.metadata ?? {},
  };
}

function normalizeEdge(input: Partial<GraphEdge>): GraphEdge {
  const normalizedId = normalizeString(input.id);
  return {
    id: normalizedId || randomUUID(),
    source: normalizeString(input.source),
    target: normalizeString(input.target),
    type: normalizeString(input.type, 'related'),
    weight: normalizeNumber(input.weight, 1),
    label: normalizeString(input.label),
    color: normalizeString(input.color, '#64748b'),
    metadata: input.metadata ?? {},
  };
}

function sanitizeState(raw?: Partial<GraphState>): GraphState {
  if (!raw) {
    return { ...DEFAULT_GRAPH_STATE };
  }

  return {
    nodes: Array.isArray(raw.nodes) ? raw.nodes.map((node) => normalizeNode(node)) : [],
    edges: Array.isArray(raw.edges) ? raw.edges.map((edge) => normalizeEdge(edge)) : [],
    version: typeof raw.version === 'number' ? raw.version : 0,
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

function applyOperations(state: GraphState, ops: GraphOperation[]): GraphState {
  if (!ops?.length) {
    return state;
  }

  const nodes = [...state.nodes];
  const edges = [...state.edges];

  for (const op of ops) {
    switch (op.type) {
      case 'node:add': {
        if (!op.node?.id) break;
        const existing = nodes.findIndex((node) => node.id === op.node.id);
        if (existing === -1) {
          nodes.push(normalizeNode(op.node));
        }
        break;
      }
      case 'node:update': {
        const idx = nodes.findIndex((node) => node.id === op.node.id);
        if (idx !== -1) {
          nodes[idx] = normalizeNode({ ...nodes[idx], ...op.node });
        }
        break;
      }
      case 'node:remove': {
        const idx = nodes.findIndex((node) => node.id === op.nodeId);
        if (idx !== -1) {
          nodes.splice(idx, 1);
          for (let i = edges.length - 1; i >= 0; i -= 1) {
            if (edges[i].source === op.nodeId || edges[i].target === op.nodeId) {
              edges.splice(i, 1);
            }
          }
        }
        break;
      }
      case 'edge:add': {
        if (!op.edge?.id) break;
        const exists = edges.findIndex((edge) => edge.id === op.edge.id);
        if (exists === -1) {
          edges.push(normalizeEdge(op.edge));
        }
        break;
      }
      case 'edge:update': {
        const idx = edges.findIndex((edge) => edge.id === op.edge.id);
        if (idx !== -1) {
          edges[idx] = normalizeEdge({ ...edges[idx], ...op.edge });
        }
        break;
      }
      case 'edge:remove': {
        const idx = edges.findIndex((edge) => edge.id === op.edgeId);
        if (idx !== -1) {
          edges.splice(idx, 1);
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    ...state,
    nodes,
    edges,
  };
}

const investigationRoom = (tenantId: string, investigationId: string) =>
  `tenant:${tenantId}:investigation:${investigationId}`;
const graphRoom = (tenantId: string, graphId: string) => `tenant:${tenantId}:graph:${graphId}`;
const graphStateKey = (tenantId: string, graphId: string) => `tenant:${tenantId}:graph:${graphId}:state`;
const graphLockKey = (tenantId: string, graphId: string) => `tenant:${tenantId}:graph:${graphId}:locks`;

function ensureGraphId(graphId?: string, investigationId?: string) {
  return graphId || investigationId || null;
}

function isNeo4jConfigured() {
  return Boolean(process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD);
}

async function persistGraphState(
  tenantId: string,
  graphId: string,
  state: GraphState,
): Promise<'ok' | 'skipped'> {
  if (!isNeo4jConfigured()) {
    console.warn('[realtime] Neo4j configuration missing, skipping graph persistence');
    return 'skipped';
  }

  const nodes = state.nodes.map((node) => ({
    id: node.id,
    label: node.label ?? '',
    type: node.type ?? 'entity',
    x: node.x ?? 0,
    y: node.y ?? 0,
    size: node.size ?? 12,
    color: node.color ?? '#2563eb',
    risk: node.risk ?? 0,
    confidence: node.confidence ?? 0,
    metadata: node.metadata ?? {},
  }));

  const edges = state.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type ?? 'related',
    weight: edge.weight ?? 1,
    label: edge.label ?? '',
    color: edge.color ?? '#64748b',
    metadata: edge.metadata ?? {},
  }));

  await runCypher(
    'MATCH (n:GraphNode { tenantId: $tenantId, graphId: $graphId }) DETACH DELETE n',
    { tenantId, graphId },
  );

  if (nodes.length > 0) {
    await runCypher(
      `UNWIND $nodes AS node
       MERGE (n:GraphNode { id: node.id, tenantId: $tenantId, graphId: $graphId })
       SET n.label = node.label,
           n.type = node.type,
           n.x = node.x,
           n.y = node.y,
           n.size = node.size,
           n.color = node.color,
           n.risk = node.risk,
           n.confidence = node.confidence,
           n.metadata = node.metadata`,
      { tenantId, graphId, nodes },
    );
  }

  if (edges.length > 0) {
    await runCypher(
      `UNWIND $edges AS edge
       MATCH (source:GraphNode { id: edge.source, tenantId: $tenantId, graphId: $graphId })
       MATCH (target:GraphNode { id: edge.target, tenantId: $tenantId, graphId: $graphId })
       MERGE (source)-[r:GRAPH_REL { id: edge.id, tenantId: $tenantId, graphId: $graphId }]->(target)
       SET r.type = edge.type,
           r.weight = edge.weight,
           r.label = edge.label,
           r.color = edge.color,
           r.metadata = edge.metadata`,
      { tenantId, graphId, edges },
    );
  }

  return 'ok';
}

export async function initRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: '/ws',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const redisUrl = process.env.REDIS_URL;
  let stateClient: Redis | null = null;

  const memoryStates = new Map<string, GraphState>();
  const memoryLocks = new Map<string, Map<string, LockInfo>>();

  if (redisUrl) {
    try {
      stateClient = new Redis(redisUrl, { lazyConnect: true });
      stateClient.on('error', (err) => console.error('[realtime] Redis state error', err));
    } catch (err) {
      console.warn('[realtime] Redis state client disabled', err);
      stateClient?.disconnect();
      stateClient = null;
    }
  }

  const loadGraphState = async (tenantId: string, graphId: string): Promise<GraphState> => {
    const key = graphStateKey(tenantId, graphId);
    if (stateClient) {
      try {
        const raw = await stateClient.get(key);
        if (raw) {
          const parsed = sanitizeState(JSON.parse(raw) as GraphState);
          memoryStates.set(key, parsed);
          return parsed;
        }
      } catch (error) {
        console.error('[realtime] Failed to load graph state from Redis', error);
      }
    }

    if (memoryStates.has(key)) {
      return sanitizeState(memoryStates.get(key));
    }

    const snapshot = { ...DEFAULT_GRAPH_STATE };
    memoryStates.set(key, snapshot);
    return snapshot;
  };

  const saveGraphState = async (tenantId: string, graphId: string, state: GraphState) => {
    const key = graphStateKey(tenantId, graphId);
    memoryStates.set(key, state);
    if (stateClient) {
      try {
        await stateClient.set(key, JSON.stringify(state));
      } catch (error) {
        console.error('[realtime] Failed to persist graph state to Redis', error);
      }
    }
  };

  const loadLocks = async (tenantId: string, graphId: string): Promise<Record<string, LockInfo>> => {
    const key = graphLockKey(tenantId, graphId);
    if (stateClient) {
      try {
        const rawLocks = await stateClient.hgetall(key);
        if (rawLocks && Object.keys(rawLocks).length > 0) {
          const result: Record<string, LockInfo> = {};
          const map = new Map<string, LockInfo>();
          for (const [lockId, value] of Object.entries(rawLocks)) {
            try {
              const parsed = JSON.parse(value) as LockInfo;
              result[lockId] = parsed;
              map.set(lockId, parsed);
            } catch (error) {
              console.error('[realtime] Failed to parse lock info', error);
            }
          }
          memoryLocks.set(key, map);
          return result;
        }
      } catch (error) {
        console.error('[realtime] Failed to load locks from Redis', error);
      }
    }

    const cached = memoryLocks.get(key);
    if (!cached) {
      return {};
    }
    const result: Record<string, LockInfo> = {};
    cached.forEach((value, lockId) => {
      result[lockId] = value;
    });
    return result;
  };

  const setLock = async (
    tenantId: string,
    graphId: string,
    resourceId: string,
    lockInfo?: LockInfo,
  ) => {
    const key = graphLockKey(tenantId, graphId);
    const existing = memoryLocks.get(key) ?? new Map<string, LockInfo>();
    if (!memoryLocks.has(key)) {
      memoryLocks.set(key, existing);
    }

    if (lockInfo) {
      existing.set(resourceId, lockInfo);
      if (stateClient) {
        try {
          await stateClient.hset(key, resourceId, JSON.stringify(lockInfo));
        } catch (error) {
          console.error('[realtime] Failed to persist lock state to Redis', error);
        }
      }
    } else {
      existing.delete(resourceId);
      if (stateClient) {
        try {
          await stateClient.hdel(key, resourceId);
        } catch (error) {
          console.error('[realtime] Failed to remove lock from Redis', error);
        }
      }
    }
  };

  io.use((socket, next) => {
    const { tenantId, userId } = socket.handshake.auth as any;
    if (!tenantId || !userId) {
      return next(new Error('FORBIDDEN'));
    }
    (socket as any).ctx = { tenantId, userId } as SocketCtx;
    next();
  });

  io.on('connection', (socket) => {
    const { tenantId, userId } = (socket as any).ctx as SocketCtx;
    const activeLocks = new Set<string>();
    const joinedRooms = new Set<string>();

    const emitLocks = async (graphId: string) => {
      const locks = await loadLocks(tenantId, graphId);
      socket.emit('graph:locks', { graphId, locks });
    };

    const emitState = async (graphId: string) => {
      const state = await loadGraphState(tenantId, graphId);
      socket.emit('graph:state', { graphId, state });
    };

    socket.on('join', async ({ investigationId, graphId }) => {
      const resolvedInvestigationId = investigationId ?? graphId;
      if (!resolvedInvestigationId) return;

      const investigation = investigationRoom(tenantId, resolvedInvestigationId);
      socket.join(investigation);
      joinedRooms.add(investigation);
      io.to(investigation).emit('presence:join', { userId, ts: Date.now() });

      const resolvedGraphId = ensureGraphId(graphId, investigationId);
      if (resolvedGraphId) {
        const room = graphRoom(tenantId, resolvedGraphId);
        socket.join(room);
        joinedRooms.add(room);
        await emitState(resolvedGraphId);
        await emitLocks(resolvedGraphId);
      }
    });

    socket.on('graph:sync', async ({ investigationId, graphId }) => {
      const resolvedGraphId = ensureGraphId(graphId, investigationId);
      if (!resolvedGraphId) return;
      await emitState(resolvedGraphId);
      await emitLocks(resolvedGraphId);
    });

    socket.on('graph:update', async (payload) => {
      const { investigationId, graphId, ops = [], state: fullState } = payload ?? {};
      const resolvedGraphId = ensureGraphId(graphId, investigationId);
      if (!resolvedGraphId) return;

      const currentState = await loadGraphState(tenantId, resolvedGraphId);
      const operations: GraphOperation[] = Array.isArray(ops) ? (ops as GraphOperation[]) : [];
      const updated = fullState
        ? sanitizeState({ ...currentState, ...fullState })
        : applyOperations(currentState, operations);

      const nextState: GraphState = {
        ...updated,
        version: (currentState.version ?? 0) + 1,
        updatedAt: Date.now(),
        updatedBy: userId,
      };

      await saveGraphState(tenantId, resolvedGraphId, nextState);
      const room = graphRoom(tenantId, resolvedGraphId);
      io.to(room).emit('graph:state', { graphId: resolvedGraphId, state: nextState });
    });

    socket.on('cursor:move', ({ investigationId, graphId, x, y }) => {
      const resolvedGraphId = ensureGraphId(graphId, investigationId);
      const room = resolvedGraphId
        ? graphRoom(tenantId, resolvedGraphId)
        : investigationId
          ? investigationRoom(tenantId, investigationId)
          : null;
      if (!room) return;
      socket.to(room).emit('cursor:move', { userId, x, y, ts: Date.now() });
    });

    socket.on('presence:heartbeat', () => {
      const ts = Date.now();
      for (const room of joinedRooms) {
        socket.to(room).emit('presence:heartbeat', { userId, ts });
      }
    });

    socket.on('lock:acquire', async ({ investigationId, graphId, id, kind }) => {
      const resolvedGraphId = ensureGraphId(graphId, investigationId);
      if (!resolvedGraphId || !id) return;

      const locks = await loadLocks(tenantId, resolvedGraphId);
      const existing = locks[id];
      if (existing && existing.userId !== userId) {
        socket.emit('lock:denied', {
          graphId: resolvedGraphId,
          id,
          holder: existing.userId,
        });
        return;
      }

      const info: LockInfo = { userId, kind, lockedAt: Date.now() };
      await setLock(tenantId, resolvedGraphId, id, info);
      activeLocks.add(`${resolvedGraphId}::${id}`);

      const room = graphRoom(tenantId, resolvedGraphId);
      io.to(room).emit('lock:update', {
        graphId: resolvedGraphId,
        id,
        kind,
        userId,
        locked: true,
        lockedAt: info.lockedAt,
      });
    });

    socket.on('lock:release', async ({ investigationId, graphId, id }) => {
      const resolvedGraphId = ensureGraphId(graphId, investigationId);
      if (!resolvedGraphId || !id) return;

      const locks = await loadLocks(tenantId, resolvedGraphId);
      const existing = locks[id];
      if (existing && existing.userId !== userId) {
        return;
      }

      await setLock(tenantId, resolvedGraphId, id);
      activeLocks.delete(`${resolvedGraphId}::${id}`);

      const room = graphRoom(tenantId, resolvedGraphId);
      io.to(room).emit('lock:update', {
        graphId: resolvedGraphId,
        id,
        userId,
        locked: false,
      });
    });

    socket.on('graph:commit', async ({ investigationId, graphId }) => {
      const resolvedGraphId = ensureGraphId(graphId, investigationId);
      if (!resolvedGraphId) return;

      const state = await loadGraphState(tenantId, resolvedGraphId);
      try {
        const status = await persistGraphState(tenantId, resolvedGraphId, state);
        const savedAt = Date.now();
        socket.emit('graph:commit:result', {
          graphId: resolvedGraphId,
          status,
          version: state.version,
          savedAt,
        });
        socket
          .to(graphRoom(tenantId, resolvedGraphId))
          .emit('graph:commit:broadcast', {
            graphId: resolvedGraphId,
            version: state.version,
            savedAt,
            userId,
          });
      } catch (error) {
        console.error('[realtime] Failed to persist graph state', error);
        socket.emit('graph:commit:result', {
          graphId: resolvedGraphId,
          status: 'error',
          error: (error as Error).message,
        });
      }
    });

    socket.on('disconnect', async () => {
      for (const room of joinedRooms) {
        io.to(room).emit('presence:leave', { userId });
      }

      for (const entry of activeLocks) {
        const [graphId, resourceId] = entry.split('::');
        await setLock(tenantId, graphId, resourceId);
        io.to(graphRoom(tenantId, graphId)).emit('lock:update', {
          graphId,
          id: resourceId,
          userId,
          locked: false,
        });
      }
    });
  });

  return io;
}
