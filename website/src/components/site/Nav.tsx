'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics/client';

interface NavItem {
  href: string;
  label: string;
}

interface NavProps {
  items: NavItem[];
  className?: string;
}

export function Nav({ items, className }: NavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'flex flex-wrap gap-2 border-b border-[var(--border)] pb-4',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() =>
              track('nav_click', { to: item.href, label: item.label })
            }
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-[rgba(255,255,255,0.08)] text-[var(--fg)]'
                : 'text-[var(--muted)] hover:text-[var(--fg)]',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
