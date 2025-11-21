import { useState, useEffect, useCallback, useRef } from 'react';

export interface RealTimeDataOptions {
  endpoint: string;
  refreshInterval?: number;
  maxRetries?: number;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useRealTimeData<T = any>(
  widgetId: string,
  options: RealTimeDataOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(options.endpoint);

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        retryCountRef.current = 0;
        options.onConnect?.();

        // Subscribe to widget data
        ws.send(JSON.stringify({
          type: 'subscribe',
          widgetId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.widgetId === widgetId) {
            setData(message.data);
            setLoading(false);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        const err = new Error('WebSocket error');
        setError(err);
        options.onError?.(err);
      };

      ws.onclose = () => {
        setConnected(false);
        options.onDisconnect?.();

        // Attempt reconnection
        const maxRetries = options.maxRetries ?? 5;
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          setTimeout(connect, delay);
        }
      };

      wsRef.current = ws;
    } catch (e) {
      setError(e as Error);
      setLoading(false);
    }
  }, [widgetId, options]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'refresh',
        widgetId,
      }));
    }
  }, [widgetId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Optional polling fallback
  useEffect(() => {
    if (options.refreshInterval && options.refreshInterval > 0) {
      const interval = setInterval(refresh, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [options.refreshInterval, refresh]);

  return {
    data,
    loading,
    error,
    connected,
    refresh,
    disconnect,
  };
}
