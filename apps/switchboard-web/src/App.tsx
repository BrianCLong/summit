import React, { useState } from 'react';
import { AdaptersPage } from './features/adapters/AdaptersPage';
import { ApprovalsPage } from './features/approvals/ApprovalsPage';

function App() {
  const [activeTab, setActiveTab] = useState<'adapters' | 'approvals'>('adapters');

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <p className="eyebrow">Switchboard</p>
            <h1>{activeTab === 'adapters' ? 'Adapters' : 'Task Inbox'}</h1>
            <p className="lede">
              {activeTab === 'adapters'
                ? 'Manage installed adapters, track verification results, and keep receipts handy for downstream audit.'
                : 'Review and authorize high-risk agent actions requiring human-in-the-loop validation.'}
            </p>
          </div>
          <nav className="header-nav">
            <button
              className={`nav-link ${activeTab === 'adapters' ? 'active' : ''}`}
              onClick={() => setActiveTab('adapters')}
            >
              Adapters
            </button>
            <button
              className={`nav-link ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              Task Inbox
            </button>
          </nav>
        </div>
      </header>
      <main>
        {activeTab === 'adapters' ? <AdaptersPage /> : <ApprovalsPage />}
      </main>

      <style>{`
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .header-nav {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .nav-link {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #888;
          padding: 0.5rem 1.25rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .nav-link.active {
          background: rgba(255, 255, 255, 0.1);
          border-color: #0078ff;
          color: #fff;
        }
        .nav-link:hover:not(.active) {
          background: rgba(255, 255, 255, 0.08);
          color: #ccc;
        }
      `}</style>
    </div>
  );
}

export default App;
