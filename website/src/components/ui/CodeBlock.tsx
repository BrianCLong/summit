export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-black/50 p-3 text-xs text-[var(--accent)]">
      <code>{code}</code>
    </pre>
  );
}
