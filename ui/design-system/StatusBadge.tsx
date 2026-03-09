import React from 'react';

export interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending';
  label: string;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  success: { bg: 'bg-semantic-success/15', text: 'text-semantic-success', dot: 'bg-semantic-success' },
  warning: { bg: 'bg-semantic-warning/15', text: 'text-semantic-warning', dot: 'bg-semantic-warning' },
  error: { bg: 'bg-semantic-error/15', text: 'text-semantic-error', dot: 'bg-semantic-error' },
  info: { bg: 'bg-semantic-info/15', text: 'text-semantic-info', dot: 'bg-semantic-info' },
  neutral: { bg: 'bg-bg-tertiary', text: 'text-fg-secondary', dot: 'bg-fg-tertiary' },
  pending: { bg: 'bg-semantic-info/15', text: 'text-semantic-info', dot: 'bg-semantic-info animate-pulse' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm', dot = true, className = '' }) => {
  const s = statusStyles[status];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${s.bg} ${s.text} ${sizeClass} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      {label}
    </span>
  );
};
