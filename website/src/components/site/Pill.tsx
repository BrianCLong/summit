import { cn } from '@/lib/utils';

interface PillProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function Pill({ children, variant = 'default', className }: PillProps) {
  const variantStyles = {
    default: 'bg-[rgba(255,255,255,0.08)] text-[var(--muted)]',
    success: 'bg-[rgba(126,231,135,0.15)] text-[var(--ok)]',
    warning: 'bg-[rgba(255,193,7,0.15)] text-[#ffc107]',
    danger: 'bg-[rgba(255,107,107,0.15)] text-[var(--danger)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
