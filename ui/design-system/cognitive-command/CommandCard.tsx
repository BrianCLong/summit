import React, { type ReactNode } from 'react';

interface CommandCardProps {
  title: string;
  subtitle?: string;
  status?: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  onClick?: () => void;
}

const STATUS_BORDERS: Record<string, string> = {
  success: 'border-l-emerald-500',
  warning: 'border-l-amber-500',
  error: 'border-l-red-500',
  neutral: 'border-l-zinc-600',
  info: 'border-l-cyan-500',
};

export function CommandCard({ title, subtitle, status = 'neutral', children, actions, className = '', onClick }: CommandCardProps) {
  return (
    <div
      className={`rounded-lg border border-zinc-800 border-l-2 ${STATUS_BORDERS[status]} bg-zinc-950 p-3 transition-colors hover:bg-zinc-900 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium text-zinc-200">{title}</h4>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
