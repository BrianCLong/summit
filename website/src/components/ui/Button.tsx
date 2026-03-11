"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function Button({ href, children, onClick, variant = "primary", className }: { href: string; children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary"; className?: string }) {
  const cls =
    variant === "primary"
      ? "bg-[var(--fg)] text-black hover:bg-[var(--muted)]"
      : "border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--card)]";
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-sm px-6 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all ${cls} ${className}`}
    >
      {children}
    </Link>
  );
}
