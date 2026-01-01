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

const CIChaos = () => {
  const [running, setRunning] = useState(null);
  const [output, setOutput] = useState('');

  const runCommand = async (cmd, label) => {
    setRunning(label);
    setOutput('');
    // Simulate command execution
    setTimeout(() => {
      setOutput(`Running ${cmd}...\n\nCommand completed successfully.\nElapsed time: 1.2s`);
      setRunning(null);
    }, 2000);
  };

  const actions = [
    {
      id: 'validate',
      label: 'Config Validate',
      cmd: 'just orchestra-validate',
      color: 'blue',
    },
    {
      id: 'smoke',
      label: 'Smoke Test',
      cmd: 'just orchestra-smoke',
      color: 'green',
    },
    {
      id: 'chaos',
      label: 'Chaos Drills',
      cmd: 'just chaos',
      color: 'red',
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="CI & Chaos">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => runCommand(action.cmd, action.label)}
              disabled={running === action.label}
              className={`p-4 rounded-lg border-2 border-dashed text-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                action.color === 'blue'
                  ? 'border-blue-500 hover:border-blue-600 hover:bg-gray-50'
                  : action.color === 'green'
                  ? 'border-green-500 hover:border-green-600 hover:bg-gray-50'
                  : 'border-red-500 hover:border-red-600 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              <div className="text-lg font-semibold">
                {action.id === 'validate' && '✅'}
                {action.id === 'smoke' && '🧪'}
                {action.id === 'chaos' && '⚡'} {action.label}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {action.cmd}
              </div>
            </button>
          ))}
        </div>

        {/* Output Console */}
        <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg min-h-[300px] overflow-auto console-text">
          {running ? (
            <div className="animate-pulse">Running {running}...</div>
          ) : output ? (
            <pre className="whitespace-pre-wrap">{output}</pre>
          ) : (
            <div className="text-gray-400">
              # Select an action to run...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CIChaos;