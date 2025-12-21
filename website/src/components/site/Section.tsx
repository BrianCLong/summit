import { cn } from '@/lib/utils';

interface SectionProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Section({
  kicker,
  title,
  subtitle,
  children,
  className,
}: SectionProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]',
        className,
      )}
    >
      {kicker && (
        <div className="text-xs uppercase tracking-widest text-[var(--muted2)]">
          {kicker}
        </div>
      )}
      <h1 className="pt-2 text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="pt-2 text-sm text-[var(--muted)] md:text-base">
          {subtitle}
        </p>
      )}
      {children && <div className="pt-4">{children}</div>}
    </section>
  );
}
