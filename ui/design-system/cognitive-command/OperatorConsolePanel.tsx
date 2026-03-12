import React, { type ReactNode } from 'react';

interface OperatorConsolePanelProps {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function OperatorConsolePanel({ title, subtitle, headerActions, children, footer, className = '' }: OperatorConsolePanelProps) {
  return (
    <section className={`flex flex-col rounded-lg border border-zinc-800 bg-zinc-950 ${className}`}>
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 py-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">{title}</h3>
          {subtitle && <p className="text-[10px] text-zinc-600">{subtitle}</p>}
        </div>
        {headerActions && <div className="flex items-center gap-1">{headerActions}</div>}
      </div>
      <div className="flex-1 overflow-auto p-4">{children}</div>
      {footer && <div className="border-t border-zinc-800 px-4 py-2">{footer}</div>}
    </section>
  );
}
