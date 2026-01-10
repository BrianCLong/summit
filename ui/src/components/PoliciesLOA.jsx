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

const PoliciesLOA = () => {
  return (
    <div className="space-y-6">
      <Card title="Orchestration Policy">
        <div className="space-y-4">
          <textarea
            value={`# Symphony Orchestration Policy
env: dev
kill_switch: false
max_loa:
  dev: 3
  staging: 2
  prod: 1

routing_rules:
  - when:
      task: "nl2cypher"
      env: "dev"
    then:
      prefer_local: true
      max_cost: 0.01
  - when:
      env: "prod"
    then:
      hosted_allowed: false

budgets:
  daily_limits:
    openrouter: 10.00
    anthropic: 25.00`}
            readOnly
            className="w-full h-96 font-mono text-sm border border-gray-300 rounded-lg p-4 bg-white text-gray-900"
            placeholder="Loading policy..."
          />
        </div>
      </Card>

      {/* LOA State Diagram Placeholder */}
      <Card title="LOA State Machine">
        <div className="text-center p-8 text-gray-500">
          LOA State Diagram visualization would appear here
        </div>
      </Card>
    </div>
  );
};

export default PoliciesLOA;