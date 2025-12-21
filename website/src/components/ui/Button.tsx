import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function Button({
  href,
  children,
  onClick,
  variant = 'primary',
  className,
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200';

  const variantStyles = {
    primary: 'bg-[var(--fg)] text-black hover:opacity-90 active:scale-[0.98]',
    secondary:
      'border border-[var(--border)] text-[var(--fg)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.02)]',
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(baseStyles, variantStyles[variant], className)}
    >
      {children}
    </Link>
  );
}
