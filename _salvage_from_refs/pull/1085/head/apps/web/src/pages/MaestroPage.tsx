// =============================================
// File: apps/web/src/pages/MaestroPage.tsx
// =============================================
import React, { useState } from 'react';
import RoutingStudio from '../components/maestro/RoutingStudio';
import WebOrchestrator from '../components/maestro/WebOrchestrator';
import BudgetsPanel from '../components/maestro/BudgetsPanel';
import LogsPanel from '../components/maestro/LogsPanel';

export default function MaestroPage() {
  const [tab, setTab] = useState<'routing' | 'web' | 'budgets' | 'logs'>('routing');
  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Maestro</h1>
        <nav className="tabs tabs-boxed ml-auto">
          <button className={`tab ${tab === 'routing' ? 'tab-active' : ''}`} onClick={() => setTab('routing')}>Routing</button>
          <button className={`tab ${tab === 'web' ? 'tab-active' : ''}`} onClick={() => setTab('web')}>Web</button>
          <button className={`tab ${tab === 'budgets' ? 'tab-active' : ''}`} onClick={() => setTab('budgets')}>Budgets</button>
          <button className={`tab ${tab === 'logs' ? 'tab-active' : ''}`} onClick={() => setTab('logs')}>Logs</button>
        </nav>
      </header>

      {tab === 'routing' && <RoutingStudio />}
      {tab === 'web' && <WebOrchestrator />}
      {tab === 'budgets' && <BudgetsPanel />}
      {tab === 'logs' && <LogsPanel />}
    </div>
  );
}
