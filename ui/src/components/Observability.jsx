import React, { useState, useEffect } from 'react';

const Card = ({ title, children, actions, className = '' }) => (
  <div className={`glass-card rounded-xl shadow-lg bg-white ${className}`} role="region" aria-labelledby={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`}>
    <div className="flex items-center justify-between p-4 border-b border-gray-100">
      <h3 id={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-lg font-semibold text-gray-900">
        {title}
      </h3>
      {actions && (
        <div className="flex items-center space-x-2">{actions}</div>
      )}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const Observability = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Simulate loading logs
    const mockLogs = [
      {
        ts: new Date().toISOString(),
        level: 'info',
        msg: 'Gateway up on :4000',
      },
      {
        ts: new Date().toISOString(),
        level: 'info',
        msg: 'Ollama listening :11434',
      },
      {
        ts: new Date().toISOString(),
        level: 'warn',
        msg: 'High queue depth: 12 messages',
      },
    ];
    setLogs(mockLogs);
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="RPS">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500">1.2</div>
            <div className="text-sm text-gray-600">requests/sec</div>
          </div>
        </Card>
        <Card title="Latency">
          <div className="text-center space-y-1">
            <div>
              <span className="text-lg font-bold">120ms</span>{' '}
              <span className="text-sm text-gray-600">p50</span>
            </div>
            <div>
              <span className="text-lg font-bold">480ms</span>{' '}
              <span className="text-sm text-gray-600">p95</span>
            </div>
          </div>
        </Card>
        <Card title="Queue Depth">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500">12</div>
            <div className="text-sm text-gray-600">pending</div>
          </div>
        </Card>
        <Card title="Error Rate (15m)">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500">0</div>
            <div className="text-sm text-gray-600">errors</div>
          </div>
        </Card>
      </div>

      {/* Live Stream Logs */}
      <Card
        title="Live Stream"
        actions={
          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Search/Filters"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Log search filter"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded focus:ring-blue-500 focus:ring-2 h-4 w-4 text-blue-600"
                aria-label="Auto refresh logs"
              />
              <span className="text-sm text-gray-900">Auto</span>
            </label>
          </div>
        }
      >
        <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-96 overflow-auto console-text">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-400">{new Date(log.ts).toLocaleTimeString()}</span>
              <span
                className={`ml-2 ${
                  log.level === 'error'
                    ? 'text-red-400'
                    : log.level === 'warn'
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }`}
              >
                [{log.level.toUpperCase()}]
              </span>
              <span className="ml-2">{log.msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Observability;