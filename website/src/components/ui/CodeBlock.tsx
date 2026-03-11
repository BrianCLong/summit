export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-none border border-[var(--border)] bg-[#050505] p-4 text-[11px] font-bold text-[var(--accent)] mono-data leading-relaxed shadow-inner">
      <code>{code}</code>
    </pre>
  );
}
