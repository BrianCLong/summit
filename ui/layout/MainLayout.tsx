import React from 'react';
import { NavigationRail } from './NavigationRail';
import { WorkspaceShell } from './WorkspaceShell';
import { ActivityStream } from './ActivityStream';
import { CommandPalette } from './CommandPalette';

export interface MainLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  userRole: 'viewer' | 'analyst' | 'operator' | 'admin';
  onNavigate: (path: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, currentPath, userRole, onNavigate }) => {
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [activityStreamOpen, setActivityStreamOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen w-screen flex bg-bg-primary text-fg-primary overflow-hidden">
      {/* Left navigation rail */}
      <NavigationRail currentPath={currentPath} userRole={userRole} onNavigate={onNavigate} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top status bar */}
        <header className="h-12 shrink-0 bg-bg-secondary border-b border-border-default flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 h-7 px-3 bg-bg-tertiary border border-border-default rounded-md text-xs text-fg-secondary hover:text-fg-primary hover:border-fg-muted transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search or run command...</span>
              <kbd className="ml-4 px-1 py-0.5 text-2xs bg-bg-secondary rounded border border-border-default font-mono">Ctrl+K</kbd>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* System telemetry indicators */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-semantic-success" />
              <span className="text-fg-secondary">All systems operational</span>
            </div>
            <button
              onClick={() => setActivityStreamOpen(!activityStreamOpen)}
              className="p-1.5 text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary rounded transition-colors relative"
              aria-label="Activity stream"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-primary" />
            </button>
            <div className="w-7 h-7 rounded-full bg-brand-secondary flex items-center justify-center text-xs font-semibold text-white">
              {userRole[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">
          <WorkspaceShell>{children}</WorkspaceShell>
          {activityStreamOpen && <ActivityStream onClose={() => setActivityStreamOpen(false)} />}
        </div>
      </div>

      {/* Command palette overlay */}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onNavigate={onNavigate} />
    </div>
  );
};
