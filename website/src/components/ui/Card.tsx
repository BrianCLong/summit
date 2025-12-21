import { cn } from '@/lib/utils';

interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, subtitle, children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]',
        className,
      )}
    >
      <div className="text-base font-semibold tracking-tight">{title}</div>
      {subtitle && (
        <div className="pt-1 text-sm text-[var(--muted2)]">{subtitle}</div>
      )}
      <div className="pt-3">{children}</div>
    </div>
  );
}
