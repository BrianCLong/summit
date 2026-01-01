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

const Neo4jGuard = () => {
  const [keepDb, setKeepDb] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [migrations] = useState([
    { name: '001_init.cypher', status: 'completed' },
    { name: '002_people.cypher', status: 'pending' },
  ]);

  const runGuard = async () => {
    setRunning(true);
    setOutput('> Run\nApplying 001… OK\nBolt ready at :7687\n');

    // Simulate API call
    setTimeout(() => {
      setOutput(prev => prev + '\nGuard completed successfully');
      setRunning(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card
        title="Neo4j Guard"
        actions={
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              MIG_DIR: db/migrations
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={keepDb}
                onChange={(e) => setKeepDb(e.target.checked)}
                className="rounded focus:ring-blue-500 focus:ring-2 h-4 w-4 text-blue-600"
                aria-label="Keep database"
              />
              <span className="text-sm">KEEP_DB: [ ]</span>
            </label>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Migrations List */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Migrations</h4>
            <div className="space-y-2">
              {migrations.map((migration, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                      migration.status === 'completed'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {migration.status === 'completed' ? '✓' : ''}
                  </span>
                  <span className="font-mono text-sm text-gray-900">
                    {migration.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Console Output */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Console</h4>
            <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg min-h-[200px] overflow-auto console-text">
              <button
                onClick={runGuard}
                disabled={running}
                className="mb-2 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                > Run
              </button>
              <pre className="whitespace-pre-wrap">
                {output || '# Ready to run migrations...'}
              </pre>
              {running && <div className="animate-pulse">▋</div>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Neo4jGuard;