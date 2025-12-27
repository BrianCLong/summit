import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentEvent, AgentMessage, AgentStatus, AgUiEnvelope } from './agentTypes';

const STATUS_VALUES: AgentStatus[] = ['idle', 'running', 'paused', 'error'];

const isAgentEvent = (payload: unknown): payload is AgentEvent => {
  if (!payload || typeof payload !== 'object') return false;
  const type = (payload as { type?: string }).type;
  return (
    type === 'tool:start' ||
    type === 'tool:end' ||
    type === 'status' ||
    type === 'delta' ||
    type === 'message' ||
    type === 'error'
  );
};

const isStatus = (value: unknown): value is AgentStatus =>
  typeof value === 'string' && STATUS_VALUES.includes(value as AgentStatus);

type UseAgUiAgentOptions<TShared> = {
  url?: string;
  threadId?: string;
  onThread?: (threadId: string) => void;
  onState?: (shared: TShared) => void;
  onEvent?: (event: AgentEvent) => void;
  onError?: (error: Error) => void;
};

type UseAgUiAgentReturn<TShared> = {
  isConnected: boolean;
  messages: AgentMessage[];
  status: AgentStatus;
  shared: TShared | null;
  threadId?: string;
  sendUserMessage: (content: string) => void;
  pause: () => void;
  resume: () => void;
  retryLastTool: () => void;
};

export function useAgUiAgent<TShared>(
  options: UseAgUiAgentOptions<TShared>,
): UseAgUiAgentReturn<TShared> {
  const { url, threadId, onThread, onState, onEvent, onError } = options;
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [shared, setShared] = useState<TShared | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const threadRef = useRef(threadId);
  const socketRef = useRef<WebSocket | null>(null);

  const post = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  }, []);

  const sendUserMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;
      post({ type: 'user:message', content });
    },
    [post],
  );

  const pause = useCallback(() => {
    post({ type: 'run:pause' });
  }, [post]);

  const resume = useCallback(() => {
    post({ type: 'run:resume' });
  }, [post]);

  const retryLastTool = useCallback(() => {
    post({ type: 'tool:retry' });
  }, [post]);

  useEffect(() => {
    threadRef.current = threadId;
  }, [threadId]);

  useEffect(() => {
    if (!url) return undefined;

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setIsConnected(true);
      if (threadRef.current) {
        post({ type: 'thread:resume', threadId: threadRef.current });
      }
    });

    socket.addEventListener('message', event => {
      try {
        const payload = JSON.parse(event.data) as AgUiEnvelope<TShared>;
        if (payload && typeof payload === 'object' && 'type' in payload) {
          if (payload.type === 'thread' && 'id' in payload) {
            const id = payload.id;
            threadRef.current = id;
            onThread?.(id);
            return;
          }
          if (payload.type === 'state' && 'value' in payload) {
            setShared(payload.value);
            onState?.(payload.value);
            return;
          }
          if (isAgentEvent(payload)) {
            if (payload.type === 'status' && isStatus(payload.value)) {
              setStatus(payload.value);
            }
            if (payload.type === 'message') {
              setMessages(prev => [
                ...prev,
                { role: payload.role, content: payload.content },
              ]);
            }
            onEvent?.(payload);
          }
        }
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('AG-UI error'));
      }
    });

    socket.addEventListener('error', () => {
      onError?.(new Error('AG-UI socket error'));
    });

    socket.addEventListener('close', () => {
      setIsConnected(false);
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [onError, onEvent, onState, onThread, post, url]);

  return useMemo(
    () => ({
      isConnected,
      messages,
      status,
      shared,
      threadId: threadRef.current,
      sendUserMessage,
      pause,
      resume,
      retryLastTool,
    }),
    [
      isConnected,
      messages,
      status,
      shared,
      sendUserMessage,
      pause,
      resume,
      retryLastTool,
    ],
  );
}
