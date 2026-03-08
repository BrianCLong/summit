"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBlock = CodeBlock;
function CodeBlock({ code }) {
    return (<pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-black/50 p-3 text-xs text-[var(--accent)]">
      <code>{code}</code>
    </pre>);
}
