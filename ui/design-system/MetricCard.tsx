import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  change?: { value: number; period: string };
  trend?: 'up' | 'down' | 'flat';
  icon?: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  sparkline?: number[];
  className?: string;
}

const statusColors: Record<string, string> = {
  success: 'text-semantic-success',
  warning: 'text-semantic-warning',
  error: 'text-semantic-error',
  info: 'text-semantic-info',
  neutral: 'text-fg-secondary',
};

const trendIcons: Record<string, string> = {
  up: 'M5 15l7-7 7 7',
  down: 'M19 9l-7 7-7-7',
  flat: 'M4 12h16',
};

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, change, trend, icon, status = 'neutral', sparkline, className = '' }) => {
  return (
    <div className={`bg-bg-surface border border-border-default rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-fg-secondary uppercase tracking-wider">{label}</span>
        {icon && <span className="text-fg-tertiary">{icon}</span>}
      </div>
      <div className="flex items-end gap-3">
        <span className={`text-2xl font-bold ${statusColors[status]}`}>{value}</span>
        {change && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend === 'up' ? 'text-semantic-success' : trend === 'down' ? 'text-semantic-error' : 'text-fg-secondary'}`}>
            {trend && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={trendIcons[trend]} />
              </svg>
            )}
            <span>{change.value > 0 ? '+' : ''}{change.value}%</span>
            <span className="text-fg-tertiary ml-0.5">{change.period}</span>
          </div>
        )}
      </div>
      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 h-8 flex items-end gap-px">
          {sparkline.map((v, i) => {
            const max = Math.max(...sparkline);
            const height = max > 0 ? (v / max) * 100 : 0;
            return <div key={i} className="flex-1 bg-brand-primary/30 rounded-t" style={{ height: `${height}%` }} />;
          })}
        </div>
      )}
    </div>
  );
};
