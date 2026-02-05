import React, { useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import RoutingStudio from './components/RoutingStudio.jsx';
import RAGConsole from './components/RAGConsole.jsx';
import Neo4jGuard from './components/Neo4jGuard.jsx';
import BudgetsBurndown from './components/BudgetsBurndown.jsx';
import PoliciesLOA from './components/PoliciesLOA.jsx';
import Observability from './components/Observability.jsx';
import CIChaos from './components/CIChaos.jsx';
import DocsRunbooks from './components/DocsRunbooks.jsx';
import { formatAbsoluteTime, formatRelativeTime } from '../utils/formatting.js';
import { tabs } from './tabs.js';
import './App.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'routing': return <RoutingStudio />;
      case 'rag': return <RAGConsole />;
      case 'neo4j': return <Neo4jGuard />;
      case 'budgets': return <BudgetsBurndown />;
      case 'policies': return <PoliciesLOA />;
      case 'observability': return <Observability />;
      case 'ci-chaos': return <CIChaos />;
      case 'docs': return <DocsRunbooks />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🎼</span>
                <h1 className="text-xl font-bold text-gray-900">
                  SYMPHONY
                </h1>
                <span className="text-sm text-gray-600">
                  ▸ {tabs.find((t) => t.id === activeTab)?.name}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                  HEALTH: GREEN
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  ENV: dev
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  LOA: 1
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Kill: OFF</span>
              <span
                title={`Last update ${formatAbsoluteTime(Date.now(), { includeDate: false })}`}
              >
                Updated {formatRelativeTime(Date.now())}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 pb-2 overflow-x-auto" role="tablist" aria-label="Main navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
                {tab.status === 'simulated' && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded ${
                    activeTab === tab.id
                      ? 'bg-blue-400 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    SIM
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" role="main">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default App;
