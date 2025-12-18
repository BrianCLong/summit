// src/pages/MaestroRunConsolePage.tsx

import * as React from 'react';
import { MaestroRunConsole } from '@/components/MaestroRunConsole';

export default function MaestroRunConsolePage() {
  // You can replace this with actual user context
  const userId = 'ui-demo-user';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Maestro Run Console
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Orchestrate complex multi-step requests through Maestro, visualize
            the task graph, and track token usage and cost per run.
          </p>
        </header>

        <MaestroRunConsole userId={userId} />
      </div>
    </main>
  );
}
