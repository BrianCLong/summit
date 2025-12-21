import { cn } from '@/lib/utils';

interface MetricProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function Metric({ label, value, trend, className }: MetricProps) {
  const trendColors = {
    up: 'text-[var(--ok)]',
    down: 'text-[var(--danger)]',
    neutral: 'text-[var(--muted)]',
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--card)] p-4',
        className,
      )}
    >
      <div className="text-xs uppercase tracking-wider text-[var(--muted2)]">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-2xl font-semibold',
          trend ? trendColors[trend] : 'text-[var(--fg)]',
        )}
      >
        {value}
      </div>
    </div>
  );
}
