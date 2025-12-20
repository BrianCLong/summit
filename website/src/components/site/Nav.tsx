import Link from "next/link";

export function Nav({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--fg)]"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
