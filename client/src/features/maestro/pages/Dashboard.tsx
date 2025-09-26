import React from 'react';
import DashboardBuilder from '../components/DashboardBuilder';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Custom Maestro Dashboard</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Compose the widgets your operators rely on—drag intelligence summaries, live query feeds, and ML insights into a
          layout tailored to your mission. Layouts persist to Maestro&apos;s control plane for every authenticated analyst.
        </p>
      </header>
      <DashboardBuilder />
    </div>
  );
}

export default DashboardPage;
