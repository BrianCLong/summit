import React from 'react';

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

const Dashboard = () => {
  const recentRoutes = [
    {
      task: 'nl2cy',
      model: 'local/llama',
      loa: 1,
      cost: 0.0,
      tokens: 245,
    },
    {
      task: 'rag',
      model: 'local/qwen-coder',
      loa: 1,
      cost: 0.0,
      tokens: 180,
    },
  ];

  const recentLogs = [
    '15:05 model=local/llama p95=120ms',
    '15:04 route plan ok',
    '15:03 neo4j guard applied 001_init',
  ];

  return (
    <div className="space-y-6">
      {/* Health & Performance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Health: GREEN" className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl font-bold text-green-600">
                120ms
              </div>
              <div className="text-sm text-gray-600">p50</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                480ms
              </div>
              <div className="text-sm text-gray-600">p95</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">1.2</div>
              <div className="text-sm text-gray-600">RPS</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">7m</div>
              <div className="text-sm text-gray-600">RAG Fresh</div>
            </div>
          </div>
          <div className="p-3 bg-gray-100 rounded-lg text-sm">
            <strong>[Budgets]</strong> OpenRouter: $0 / $10 (0%) reset
            00:12:32
          </div>
        </Card>

        <Card title="Queue / Errors">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500">12</div>
              <div className="text-sm text-gray-600">Queue</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Errors(15m)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">0</div>
              <div className="text-sm text-gray-600">DLQ</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions & Burndown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Quick Actions">
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
              Run Smoke
            </button>
            <button className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors">
              Chaos Drill
            </button>
            <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors">
              ValidateCfg
            </button>
          </div>
        </Card>

        <Card
          title="Burndown (last 60s / 1h / daily)"
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full"
                  style={{ width: '35%' }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">
                rpm cap... reset m:00
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>model: local/llama</strong> req:14 p50 90ms
              </div>
              <div>
                <strong>model: ...cpu</strong> req:10 p50 180ms
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Routes (10)">
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-gray-600 pb-2 border-b border-gray-100">
              <div>task</div>
              <div>model</div>
              <div>LOA</div>
              <div>cost</div>
              <div>tok</div>
            </div>
            {recentRoutes.map((route, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 text-sm">
                <div className="font-mono">{route.task}</div>
                <div className="font-mono text-blue-600">
                  …/{route.model.split('/')[1]}
                </div>
                <div>{route.loa}</div>
                <div>${route.cost.toFixed(3)}</div>
                <div>{route.tokens}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Logs (tail)">
          <div className="space-y-1 font-mono text-sm" aria-label="Recent system logs">
            {recentLogs.map((log, index) => (
              <div key={index} className="text-gray-700">
                {log}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;