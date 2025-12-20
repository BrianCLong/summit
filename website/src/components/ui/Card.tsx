import type { ReactNode } from "react";

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
      <div className="text-base font-semibold tracking-tight">{title}</div>
      {subtitle ? <div className="pt-1 text-sm text-[var(--muted2)]">{subtitle}</div> : null}
      <div className="pt-3">{children}</div>
    </div>
  );
}
