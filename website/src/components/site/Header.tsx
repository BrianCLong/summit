"use client";

import Link from "next/link";
import { MobileNav } from "@/components/site/MobileNav";
import { track } from "@/lib/analytics/client";

const links = [
  { href: "/summit", label: "Summit" },
  { href: "/pricing", label: "Pricing" },
  { href: "/initiatives", label: "Initiatives" },
  { href: "/research", label: "Research" },
  { href: "/writing", label: "Writing" },
  { href: "/contact", label: "Contact" }
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(11,15,20,0.85)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="font-semibold tracking-tight"
          onClick={() => track("nav_click", { to: "/", label: "Topicality" })}
        >
          Topicality<span className="text-[var(--muted2)]">.co</span>
        </Link>
        <nav className="hidden gap-5 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--muted)] hover:text-[var(--fg)]"
              onClick={() => track("nav_click", { to: l.href, label: l.label })}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <MobileNav links={links} />
      </div>
    </header>
  );
}
