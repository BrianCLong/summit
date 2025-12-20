"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function Button({ href, children, onClick, variant = "primary" }: { href: string; children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" }) {
  const cls =
    variant === "primary"
      ? "bg-[var(--fg)] text-black hover:opacity-90"
      : "border border-[var(--border)] text-[var(--fg)] hover:border-[rgba(255,255,255,0.2)]";
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${cls}`}
    >
      {children}
    </Link>
  );
}
