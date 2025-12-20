import type { ReactNode } from "react";

export function Section({ kicker, title, subtitle, children }: { kicker?: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
      {kicker ? <div className="text-xs uppercase tracking-widest text-[var(--muted2)]">{kicker}</div> : null}
      <h1 className="pt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {subtitle ? <p className="pt-2 text-sm text-[var(--muted)] md:text-base">{subtitle}</p> : null}
      {children ? <div className="pt-4">{children}</div> : null}
    </section>
  );
}
