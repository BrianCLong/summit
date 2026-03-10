import React, { useState, useRef, useCallback, type ReactNode } from 'react';

interface CognitivePanelHostProps {
  title: string;
  children: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  collapsible?: boolean;
  className?: string;
}

export function CognitivePanelHost({
  title,
  children,
  collapsible = true,
  className = '',
}: CognitivePanelHostProps) {
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    if (collapsible) setCollapsed((prev) => !prev);
  }, [collapsible]);

  return (
    <section
      ref={panelRef}
      className={`flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 ${className}`}
      role="region"
      aria-label={title}
    >
      <div className="flex h-8 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
        <div className="flex items-center gap-1">
          {collapsible && (
            <button
              onClick={handleToggle}
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
            >
              <svg className={`h-3 w-3 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {!collapsed && <div className="flex-1 overflow-auto p-3">{children}</div>}
    </section>
  );
}
