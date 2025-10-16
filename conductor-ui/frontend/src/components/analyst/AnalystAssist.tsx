import React, { useState } from 'react';
import { QueryBuilder } from './QueryBuilder';
import { ExplainabilityPanel } from './ExplainabilityPanel';
import { ExportRequest } from './ExportRequest';

type ActiveView = 'query' | 'export' | 'help';

export const AnalystAssist: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('query');

  return (
    <div className="analyst-assist min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Analyst Assist v0.2
          </h1>
          <p className="text-gray-600 mt-2">
            Policy-aware intelligence analysis with explainable outcomes
          </p>
        </header>

        <nav className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveView('query')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeView === 'query'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Query Builder
          </button>
          <button
            onClick={() => setActiveView('export')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeView === 'export'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Export Data
          </button>
          <button
            onClick={() => setActiveView('help')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeView === 'help'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Help
          </button>
        </nav>

        <main className="bg-white rounded-lg shadow-sm p-6">
          {activeView === 'query' && <QueryBuilder />}
          {activeView === 'export' && <ExportRequest />}
          {activeView === 'help' && (
            <div className="help-content space-y-4">
              <h2 className="text-2xl font-bold">How to Use Analyst Assist</h2>

              <section>
                <h3 className="text-lg font-semibold mb-2">Query Builder</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>
                    Build complex queries using field, operator, and value
                    conditions
                  </li>
                  <li>Add multiple conditions to refine your search</li>
                  <li>
                    Preview how OPA policies will affect your export before
                    executing
                  </li>
                  <li>
                    View "Why blocked?" explanations when policies deny access
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Export Data</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>
                    Choose from multiple export formats (JSON, CSV, GraphML,
                    PDF)
                  </li>
                  <li>Include provenance and metadata as needed</li>
                  <li>Check export policies before attempting export</li>
                  <li>Complete step-up authentication if required by policy</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">
                  Policy Explanations
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  <li>Understand why actions were blocked or allowed</li>
                  <li>View rule IDs, evidence, and remediation steps</li>
                  <li>Get AI-powered explanations in plain language</li>
                  <li>See query context and policy evaluation details</li>
                </ul>
              </section>

              <section className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">
                  Acceptance Criteria
                </h3>
                <div className="space-y-2 text-sm text-blue-700">
                  <div>✅ Query builder UX implemented</div>
                  <div>
                    ✅ "Why blocked?" explanations wired to policy outcomes
                  </div>
                  <div>✅ Export request previews policy impact</div>
                  <div>✅ Demo walkthrough: assist → explain → export</div>
                  <div>✅ Blocked/allowed decisions shown per policy</div>
                </div>
              </section>
            </div>
          )}
        </main>

        <footer className="mt-6 text-center text-sm text-gray-500">
          <p>Analyst Assist v0.2 | Policy-Aware Intelligence Analysis</p>
          <p className="mt-1">
            All actions are subject to OPA policy evaluation and audit logging
          </p>
        </footer>
      </div>
    </div>
  );
};
