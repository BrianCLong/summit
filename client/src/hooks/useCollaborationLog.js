import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSocket, sendCollabEvent } from '../services/socket';

const noopVector = {};

export default function useCollaborationLog(investigationId, currentUser) {
  const [history, setHistory] = useState([]);
  const [versionVector, setVersionVector] = useState(noopVector);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const opCache = useRef(new Map());
  const appliedOps = useRef(new Set());

  const upsertEntry = useCallback((entry) => {
    if (!entry?.opId) return;
    opCache.current.set(entry.opId, entry);
    setHistory((prev) => {
      const existingIndex = prev.findIndex((item) => item.opId === entry.opId);
      if (existingIndex >= 0) {
        const clone = [...prev];
        clone[existingIndex] = { ...clone[existingIndex], ...entry, optimistic: false };
        return clone;
      }
      return [...prev, entry];
    });
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !investigationId) return undefined;

    socket.emit('collab:history', { investigationId });

    const handleOp = (entry) => {
      if (entry?.investigationId !== investigationId) return;
      if (appliedOps.current.has(entry.opId) && entry.status !== 'reapplied') return;
      upsertEntry(entry);
      if (entry.authorId === currentUser?.id) {
        setUndoStack((prev) => [...prev, entry]);
        setRedoStack([]);
      }
      setVersionVector(entry.versionVector || noopVector);
    };

    const handleHistory = (payload) => {
      if (payload?.investigationId !== investigationId) return;
      opCache.current = new Map(
        (payload.entries || []).map((entry) => [entry.opId, entry]),
      );
      setHistory(payload.entries || []);
      setVersionVector(payload.versionVector || noopVector);
      setUndoStack([]);
      setRedoStack([]);
    };

    const handleNoop = (payload) => {
      if (payload?.reason && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('Collaboration noop:', payload.reason);
      }
    };

    socket.on('collab:op', handleOp);
    socket.on('collab:history', handleHistory);
    socket.on('collab:noop', handleNoop);

    return () => {
      socket.off('collab:op', handleOp);
      socket.off('collab:history', handleHistory);
      socket.off('collab:noop', handleNoop);
    };
  }, [currentUser?.id, investigationId, upsertEntry]);

  const recordOperation = useCallback(
    (event, payload = {}) => {
      if (!investigationId) return null;
      const opId = sendCollabEvent(event, {
        investigationId,
        baseVersion: history.length,
        ...payload,
      });
      const optimistic = {
        opId,
        event,
        investigationId,
        authorId: currentUser?.id || 'local-user',
        timestamp: new Date().toISOString(),
        version: history.length + 1,
        versionVector,
        payload,
        optimistic: true,
        status: 'pending',
      };
      appliedOps.current.add(opId);
      upsertEntry(optimistic);
      setUndoStack((prev) => [...prev, optimistic]);
      setRedoStack([]);
      return opId;
    },
    [currentUser?.id, history.length, investigationId, upsertEntry, versionVector],
  );

  const requestUndo = useCallback(() => {
    const socket = getSocket();
    if (!socket || !investigationId) return;
    socket.emit('collab:undo', { investigationId });
  }, [investigationId]);

  const requestRedo = useCallback(() => {
    const socket = getSocket();
    if (!socket || !investigationId) return;
    socket.emit('collab:redo', { investigationId });
  }, [investigationId]);

  const timeline = useMemo(
    () => history.slice().sort((a, b) => (a.version || 0) - (b.version || 0)),
    [history],
  );

  const nextUnapplied = useCallback(
    (applier) => {
      const pending = timeline.find((entry) => !appliedOps.current.has(entry.opId));
      if (!pending) return null;
      appliedOps.current.add(pending.opId);
      applier?.(pending);
      return pending;
    },
    [timeline],
  );

  return {
    history: timeline,
    versionVector,
    undoStack,
    redoStack,
    recordOperation,
    requestUndo,
    requestRedo,
    nextUnapplied,
  };
}
