import type { ReactNode } from "react";

export function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-sm border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow)] ${className}`}>
      <div className="text-sm font-black uppercase tracking-[0.2em] text-[var(--fg)]">{title}</div>
      {subtitle ? <div className="pt-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted2)]">{subtitle}</div> : null}
      <div className="pt-4">{children}</div>
    </div>
  );
}
