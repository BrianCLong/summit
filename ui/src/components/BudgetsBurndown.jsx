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

const BudgetsBurndown = () => {
  const nextMinute = new Date();
  nextMinute.setSeconds(nextMinute.getSeconds() + 60);
  
  const nextMidnight = new Date();
  nextMidnight.setUTCHours(24, 0, 0, 0);

  return (
    <div className="space-y-6">
      <Card title="Burndown & Budgets">
        {/* Minute Window */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">
            Minute Window (reset {nextMinute.toLocaleTimeString()})
          </h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium w-32 text-gray-900">
                local/llama
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{ width: '23%' }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">
                14/60 rpm p50 90ms
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium w-32 text-gray-900">
                local/llama-cpu
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full"
                  style={{ width: '17%' }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">
                10/60 rpm p50 180ms
              </span>
            </div>
          </div>
        </div>

        {/* Daily Budgets */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Daily Budgets (reset 00:00Z)
          </h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium w-32 text-gray-900">openrouter</span>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-purple-500 h-4 rounded-full"
                  style={{ width: '0%' }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">$0 / $10 (0%)</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BudgetsBurndown;