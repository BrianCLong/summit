import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSocket from './useSocket';

type GraphNode = {
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
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
  weight?: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
};

type GraphState = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  version: number;
  updatedAt?: number;
  updatedBy?: string;
};

type GraphOperation =
  | { type: 'node:add'; node: GraphNode }
  | { type: 'node:update'; node: Partial<GraphNode> & { id: string } }
  | { type: 'node:remove'; nodeId: string }
  | { type: 'edge:add'; edge: GraphEdge }
  | { type: 'edge:update'; edge: Partial<GraphEdge> & { id: string } }
  | { type: 'edge:remove'; edgeId: string };

type CursorPayload = { x: number; y: number };

type LockInfo = {
  userId: string;
  kind?: string;
  lockedAt?: number;
};

export interface GraphCollaborationOptions {
  graphId: string;
  investigationId?: string;
  tenantId?: string;
  userId?: string;
  enabled?: boolean;
  initialState?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

export interface GraphCollaborationHook {
  state: GraphState;
  connected: boolean;
  participants: string[];
  locks: Record<string, LockInfo>;
  lockOwner: string | null;
  isGraphLockedByMe: boolean;
  pendingChanges: boolean;
  isCommitting: boolean;
  lastSavedAt: number | null;
  connectionError: string | null;
  applyOperations: (operations: GraphOperation[]) => void;
  commit: () => Promise<void>;
  toggleGraphLock: () => void;
  sendCursor: (cursor: CursorPayload) => void;
  currentUserId: string;
}

const FALLBACK_ID = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const normalizeNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeString = (value: unknown, fallback = '') =>
  (typeof value === 'string' && value.length ? value : fallback);

const normalizeNode = (node: Partial<GraphNode>): GraphNode => ({
  id: node.id && node.id.length ? node.id : FALLBACK_ID(),
  label: normalizeString(node.label),
  type: normalizeString(node.type, 'entity'),
  x: normalizeNumber(node.x),
  y: normalizeNumber(node.y),
  size: normalizeNumber(node.size, 14),
  color: normalizeString(node.color, '#2563eb'),
  risk: normalizeNumber(node.risk),
  confidence: normalizeNumber(node.confidence, 0.8),
  metadata: node.metadata ?? {},
});

const normalizeEdge = (edge: Partial<GraphEdge>): GraphEdge => ({
  id: edge.id && edge.id.length ? edge.id : FALLBACK_ID(),
  source: normalizeString(edge.source),
  target: normalizeString(edge.target),
  type: normalizeString(edge.type, 'relationship'),
  weight: normalizeNumber(edge.weight, 1),
  label: normalizeString(edge.label),
  color: normalizeString(edge.color, '#64748b'),
  metadata: edge.metadata ?? {},
});

const sanitizeState = (input?: Partial<GraphState>): GraphState => ({
  nodes: Array.isArray(input?.nodes) ? input!.nodes.map((node) => normalizeNode(node)) : [],
  edges: Array.isArray(input?.edges) ? input!.edges.map((edge) => normalizeEdge(edge)) : [],
  version: typeof input?.version === 'number' ? input!.version : 0,
  updatedAt: input?.updatedAt,
  updatedBy: input?.updatedBy,
});

const applyGraphOperations = (state: GraphState, ops: GraphOperation[]): GraphState => {
  if (!ops.length) {
    return state;
  }

  const nodes = [...state.nodes];
  const edges = [...state.edges];

  for (const op of ops) {
    switch (op.type) {
      case 'node:add': {
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
        const existing = edges.findIndex((edge) => edge.id === op.edge.id);
        if (existing === -1) {
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
};

export function useGraphCollaboration(options: GraphCollaborationOptions): GraphCollaborationHook {
  const {
    graphId,
    investigationId,
    tenantId = 'demo-tenant',
    userId = 'demo-user',
    enabled = true,
    initialState,
  } = options;

  const initialGraphState = useMemo(
    () => sanitizeState(initialState ? { ...initialState, version: 0 } : undefined),
    [initialState],
  );

  const [graphState, setGraphState] = useState<GraphState>(initialGraphState);
  const [participants, setParticipants] = useState<string[]>([]);
  const [locks, setLocks] = useState<Record<string, LockInfo>>({});
  const [pendingChanges, setPendingChanges] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const lastAckedVersionRef = useRef(graphState.version);
  const expectedVersionRef = useRef<number | null>(null);
  const hasSyncedRef = useRef(false);
  const bootstrapSentRef = useRef(false);
  const lockId = useMemo(() => `graph:${graphId}`, [graphId]);

  const { socket, connected, error, emit, on, off } = useSocket('/', {
    path: '/ws',
    auth: { tenantId, userId },
    enabled,
  });

  useEffect(() => {
    setConnectionError(error ?? null);
  }, [error]);

  useEffect(() => {
    if (!enabled || !socket || !connected) {
      return;
    }

    const payload = {
      graphId,
      investigationId: investigationId ?? graphId,
    };

    emit('join', payload);
    emit('graph:sync', payload);

    setParticipants((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return Array.from(next);
    });

    return () => {
      emit('lock:release', { ...payload, id: lockId });
    };
  }, [socket, connected, emit, enabled, graphId, investigationId, lockId, userId]);

  useEffect(() => {
    if (!enabled) {
      setGraphState(initialGraphState);
    }
  }, [enabled, initialGraphState]);

  useEffect(() => {
    if (!socket) return;

    const handleState = (payload: { graphId: string; state: GraphState }) => {
      if (payload.graphId !== graphId) return;
      const sanitized = sanitizeState(payload.state);
      setGraphState(sanitized);
      lastAckedVersionRef.current = sanitized.version;
      if (expectedVersionRef.current && sanitized.version >= expectedVersionRef.current) {
        expectedVersionRef.current = null;
        setPendingChanges(false);
      }
      if (sanitized.updatedAt) {
        setLastSavedAt(sanitized.updatedAt);
      }

      if (!hasSyncedRef.current) {
        hasSyncedRef.current = true;
        if (
          !bootstrapSentRef.current &&
          sanitized.version === 0 &&
          sanitized.nodes.length === 0 &&
          sanitized.edges.length === 0 &&
          (initialGraphState.nodes.length > 0 || initialGraphState.edges.length > 0)
        ) {
          bootstrapSentRef.current = true;
          emit('graph:update', {
            graphId,
            investigationId: investigationId ?? graphId,
            ops: [],
            state: {
              nodes: initialGraphState.nodes,
              edges: initialGraphState.edges,
              version: 0,
            },
          });
        }
      }
    };

    const handleLocks = (payload: { graphId: string; locks: Record<string, LockInfo> }) => {
      if (payload.graphId !== graphId) return;
      setLocks(payload.locks ?? {});
    };

    const handleLockUpdate = (
      payload: { graphId: string; id: string; locked: boolean; userId: string; kind?: string; lockedAt?: number },
    ) => {
      if (payload.graphId !== graphId) return;
      setLocks((prev) => {
        const next = { ...prev };
        if (payload.locked) {
          next[payload.id] = { userId: payload.userId, kind: payload.kind, lockedAt: payload.lockedAt };
        } else {
          delete next[payload.id];
        }
        return next;
      });
    };

    const handleCommitResult = (
      payload: { graphId: string; status: string; savedAt?: number; error?: string; version?: number },
    ) => {
      if (payload.graphId !== graphId) return;
      setIsCommitting(false);
      if (payload.status === 'error') {
        setConnectionError(payload.error ?? 'Failed to persist graph');
      } else {
        setLastSavedAt(payload.savedAt ?? Date.now());
        setPendingChanges(false);
        expectedVersionRef.current = null;
      }
    };

    const handleCommitBroadcast = (payload: { graphId: string; savedAt?: number }) => {
      if (payload.graphId !== graphId) return;
      setLastSavedAt(payload.savedAt ?? Date.now());
    };

    const handlePresenceJoin = (payload: { userId: string }) => {
      if (!payload?.userId) return;
      setParticipants((prev) => {
        const next = new Set(prev);
        next.add(payload.userId);
        return Array.from(next);
      });
    };

    const handlePresenceLeave = (payload: { userId: string }) => {
      if (!payload?.userId) return;
      setParticipants((prev) => prev.filter((id) => id !== payload.userId));
    };

    const handlePresenceHeartbeat = (payload: { userId: string }) => {
      if (!payload?.userId) return;
      setParticipants((prev) => (prev.includes(payload.userId) ? prev : [...prev, payload.userId]));
    };

    on('graph:state', handleState);
    on('graph:locks', handleLocks);
    on('lock:update', handleLockUpdate);
    on('graph:commit:result', handleCommitResult);
    on('graph:commit:broadcast', handleCommitBroadcast);
    on('presence:join', handlePresenceJoin);
    on('presence:leave', handlePresenceLeave);
    on('presence:heartbeat', handlePresenceHeartbeat);

    return () => {
      off('graph:state', handleState);
      off('graph:locks', handleLocks);
      off('lock:update', handleLockUpdate);
      off('graph:commit:result', handleCommitResult);
      off('graph:commit:broadcast', handleCommitBroadcast);
      off('presence:join', handlePresenceJoin);
      off('presence:leave', handlePresenceLeave);
      off('presence:heartbeat', handlePresenceHeartbeat);
    };
  }, [socket, on, off, graphId, emit, initialGraphState, investigationId]);

  const applyOperations = useCallback(
    (operations: GraphOperation[]) => {
      if (!operations.length) return;

      setGraphState((prev) => {
        const applied = applyGraphOperations(prev, operations);
        const nextVersion = (expectedVersionRef.current ?? lastAckedVersionRef.current) + 1;
        const nextState = {
          ...applied,
          version: nextVersion,
          updatedAt: Date.now(),
          updatedBy: userId,
        };
        expectedVersionRef.current = nextVersion;
        setPendingChanges(true);
        if (enabled && socket) {
          emit('graph:update', {
            graphId,
            investigationId: investigationId ?? graphId,
            ops: operations,
            state: {
              nodes: nextState.nodes,
              edges: nextState.edges,
              version: nextVersion,
              updatedAt: nextState.updatedAt,
            },
          });
        }
        return nextState;
      });
    },
    [emit, enabled, socket, graphId, investigationId, userId],
  );

  const commit = useCallback(() => {
    if (!enabled || !socket) {
      setPendingChanges(false);
      return Promise.resolve();
    }
    setIsCommitting(true);
    return new Promise<void>((resolve) => {
      const handle = (payload: { graphId: string }) => {
        if (payload.graphId !== graphId) return;
        off('graph:commit:result', handle);
        resolve();
      };
      on('graph:commit:result', handle);
      emit('graph:commit', { graphId, investigationId: investigationId ?? graphId });
    });
  }, [emit, enabled, graphId, investigationId, on, off, socket]);

  const toggleGraphLock = useCallback(() => {
    if (!enabled || !socket) return;
    const currentLock = locks[lockId];
    const payload = { graphId, investigationId: investigationId ?? graphId, id: lockId, kind: 'graph' };
    if (currentLock && currentLock.userId === userId) {
      emit('lock:release', payload);
    } else if (!currentLock || currentLock.userId === userId) {
      emit('lock:acquire', payload);
    }
  }, [emit, enabled, socket, locks, lockId, graphId, investigationId, userId]);

  const sendCursor = useCallback(
    ({ x, y }: CursorPayload) => {
      if (!enabled || !socket) return;
      emit('cursor:move', { graphId, investigationId: investigationId ?? graphId, x, y });
    },
    [emit, enabled, socket, graphId, investigationId],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const global = (window as any).__graphCollab || ((window as any).__graphCollab = {});
    global[graphId] = {
      applyOperations,
      commit,
      getState: () => graphState,
      getParticipants: () => participants,
      getLocks: () => locks,
      isConnected: () => connected,
      hasPendingChanges: () => pendingChanges,
      lastSavedAt: () => lastSavedAt,
      toggleLock: () => toggleGraphLock(),
    };
    return () => {
      if ((window as any).__graphCollab) {
        delete (window as any).__graphCollab[graphId];
      }
    };
  }, [graphId, graphState, participants, locks, connected, pendingChanges, lastSavedAt, applyOperations, commit, toggleGraphLock]);

  const lockOwner = locks[lockId]?.userId ?? null;
  const isGraphLockedByMe = lockOwner === userId;

  return {
    state: graphState,
    connected: Boolean(socket && connected),
    participants,
    locks,
    lockOwner,
    isGraphLockedByMe,
    pendingChanges,
    isCommitting,
    lastSavedAt,
    connectionError,
    applyOperations,
    commit,
    toggleGraphLock,
    sendCursor,
    currentUserId: userId,
  };
}

export default useGraphCollaboration;
