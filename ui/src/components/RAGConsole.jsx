import React, { useState } from 'react';

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

const RAGConsole = () => {
  const [query, setQuery] = useState('how do we run neo4j guard?');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ragStats] = useState({
    files: 4,
    updated: '10m ago',
  });

  const handleQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setResponse({
        answer: 'Use cypher-shell in disposable DB…',
        context: [
          { text: 'cypher-shell migration guide...', id: 1 },
          { text: 'migrations directory structure...', id: 2 },
        ],
        sources: [{ file: 'neo4j_guard.txt' }, { file: 'docs/...' }],
      });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card
        title={`RAG Console - Index: ${ragStats.files} files • Updated: ${ragStats.updated}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Query Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Query
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="[ how do we run neo4j… ]"
                className="w-full h-20 border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleQuery}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'Searching...' : '[ Ask ]'}
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                [ Settings ]
              </button>
            </div>
          </div>

          {/* Answer Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer{' '}
              {response?.context?.length ? `(with [1][2] cites)` : ''}
            </label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 min-h-[120px]">
              {loading ? (
                <div className="text-gray-600">Searching...</div>
              ) : response?.answer ? (
                <div className="text-sm whitespace-pre-wrap text-gray-900">
                  {response.answer}
                </div>
              ) : (
                <div className="text-gray-600">No response yet</div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Context and Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Context Chunks [1..5]">
          <div className="space-y-2 text-sm">
            {response?.context?.length ? (
              response.context.slice(0, 5).map((chunk, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-50 rounded border-l-4 border-blue-500"
                >
                  <div className="font-bold">[{index + 1}]</div>
                  <div className="text-gray-700">
                    {chunk.text?.substring(0, 100) ||
                      `… ${chunk.id === 1 ? 'cypher-shell…' : 'migrations…'}`}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500">
                No context chunks available
              </div>
            )}
          </div>
        </Card>

        <Card title="Source Files">
          <div className="space-y-1 text-sm">
            {response?.sources?.length ? (
              response.sources.map((source, index) => (
                <div key={index} className="font-mono text-blue-600">
                  rag/corpus/{source.file || 'unknown.txt'}
                </div>
              ))
            ) : (
              <>
                <div className="font-mono text-blue-600">
                  rag/corpus/neo4j_guard.txt
                </div>
                <div className="font-mono text-blue-600">docs/…</div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RAGConsole;