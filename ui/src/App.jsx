import React, { useState, useEffect } from 'react';
import { SymphonyProvider, useSymphony } from './context/SymphonyContext';
import api from './api.js';
import Dashboard from './components/Dashboard.jsx';
import RoutingStudio from './components/RoutingStudio.jsx';
import RAGConsole from './components/RAGConsole.jsx';
import Neo4jGuard from './components/Neo4jGuard.jsx';
import BudgetsBurndown from './components/BudgetsBurndown.jsx';
import PoliciesLOA from './components/PoliciesLOA.jsx';
import Observability from './components/Observability.jsx';
import CIChaos from './components/CIChaos.jsx';
import DocsRunbooks from './components/DocsRunbooks.jsx';
import './App.css';

// Main App component that uses the Symphony context
const AppContent = () => {
  const { systemStatus, lastUpdate, setSystemStatus } = useSymphony();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'routing', name: 'Routing Studio', icon: '🎯' },
    { id: 'rag', name: 'RAG Console', icon: '🔍' },
    { id: 'neo4j', name: 'Neo4j Guard', icon: '🛡️' },
    { id: 'budgets', name: 'Budgets & Burndown', icon: '💰' },
    { id: 'policies', name: 'Policies & LOA', icon: '📋' },
    { id: 'observability', name: 'Observability', icon: '👁️' },
    { id: 'ci-chaos', name: 'CI & Chaos', icon: '⚡' },
    { id: 'docs', name: 'Docs & Runbooks', icon: '📚' },
  ];

  // Auto-refresh system status
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const health = await api.getHealth();
        setSystemStatus(health);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [setSystemStatus]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard systemStatus={systemStatus} />;
      case 'routing': return <RoutingStudio />;
      case 'rag': return <RAGConsole />;
      case 'neo4j': return <Neo4jGuard />;
      case 'budgets': return <BudgetsBurndown />;
      case 'policies': return <PoliciesLOA />;
      case 'observability': return <Observability />;
      case 'ci-chaos': return <CIChaos />;
      case 'docs': return <DocsRunbooks />;
      default: return <Dashboard systemStatus={systemStatus} />;
    }
  };

  // Status indicators based on system status
  const getServicesStatus = () => {
    if (!systemStatus) return [
      { name: 'Models', count: 7, status: 'up' },
      { name: 'Ollama', status: 'up' },
      { name: 'LiteLLM', status: 'up' },
      { name: 'Neo4j', status: 'up' },
      { name: 'Federation', status: 'ready' },
    ];

    return [
      { name: 'Models', count: systemStatus.models || 7, status: 'up' },
      { name: 'Ollama', status: systemStatus.ollama ? 'up' : 'down' },
      { name: 'LiteLLM', status: systemStatus.litellm ? 'up' : 'down' },
      { name: 'Neo4j', status: systemStatus.neo4j ? 'up' : 'down' },
      { name: 'Federation', status: 'ready' },
    ];
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

              {/* Status indicators */}
              <div className="flex items-center space-x-3 text-sm" aria-label="System status indicators">
                {getServicesStatus().map((service, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    <div
                      className={`status-indicator rounded-full ${
                        service.status === 'up' || service.status === 'ready'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                      aria-label={`${service.name} status: ${service.status}`}
                      role="status"
                    ></div>
                    <span className="text-gray-600">
                      {service.name}
                      {service.count ? `: ${service.count}` : ''}:{' '}
                      {service.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>ENV: dev</span>
              <span>LOA: 1</span>
              <span>Kill: OFF</span>
              <span>{lastUpdate.toLocaleTimeString()}</span>
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

// Wrap the main App with the SymphonyProvider
const App = () => {
  return (
    <SymphonyProvider>
      <AppContent />
    </SymphonyProvider>
  );
};

export default App;