// conductor-ui/frontend/src/components/runs/StreamingLogsPane.tsx
import React, { useState, useEffect } from 'react';

export const StreamingLogsPane = ({ runId }: { runId: string }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // In a real app, connect to a WebSocket/SSE endpoint at `/runs/${runId}/logs`
    const mockLogStream = setInterval(() => {
      if (!isPaused) {
        setLogs((prev) => [
          ...prev,
          `${new Date().toISOString()}: Log entry #${prev.length + 1}`,
        ]);
      }
    }, 2000);
    return () => clearInterval(mockLogStream);
  }, [runId, isPaused]);

  return (
    <div>
      <h3>Streaming Logs</h3>
      <button onClick={() => setIsPaused(!isPaused)}>
        {isPaused ? 'Resume' : 'Pause'}
      </button>
      <pre
        style={{
          height: '300px',
          overflowY: 'scroll',
          border: '1px solid #ccc',
          background: '#f5f5f5',
        }}
      >
        {logs.join('\n')}
      </pre>
    </div>
  );
};
