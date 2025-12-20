"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics/client";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--fg)]"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Toggle navigation"
      >
        Menu
      </button>
      {open ? (
        <div className="absolute right-4 mt-2 w-48 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow)]">
          <nav className="flex flex-col gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-[var(--muted)] hover:text-[var(--fg)]"
                onClick={() => {
                  setOpen(false);
                  track("nav_click", { to: l.href, label: l.label });
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
