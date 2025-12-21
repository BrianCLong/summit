import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-[var(--muted)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>&copy; {currentYear} Topicality</span>
          <div className="flex gap-4">
            <Link className="hover:text-[var(--fg)]" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-[var(--fg)]" href="/legal">
              Legal
            </Link>
            <Link className="hover:text-[var(--fg)]" href="/status">
              Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
