import React from 'react';

export default function DiffView({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  const a = (before || '').split('\n');
  const b = (after || '').split('\n');
  const rows: { t: 'same' | 'add' | 'del'; s: string }[] = [];
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      rows.push({ t: 'same', s: a[i] });
      i++;
      j++;
      continue;
    }
    if (j < b.length && !a.includes(b[j])) {
      rows.push({ t: 'add', s: b[j] });
      j++;
      continue;
    }
    if (i < a.length && !b.includes(a[i])) {
      rows.push({ t: 'del', s: a[i] });
      i++;
      continue;
    }
    if (i < a.length) {
      rows.push({ t: 'del', s: a[i++] });
    }
    if (j < b.length) {
      rows.push({ t: 'add', s: b[j++] });
    }
  }
  return (
    <div
      className="max-h-72 overflow-auto rounded border font-mono text-xs"
      role="region"
      aria-label="Diff preview"
    >
      {rows.map((r, idx) => (
        <div
          key={idx}
          className={`whitespace-pre-wrap px-2 py-0.5 ${r.t === 'same' ? 'bg-white' : r.t === 'add' ? 'bg-emerald-50' : 'bg-red-50'}`}
        >
          <span
            className={`inline-block w-4 ${r.t === 'same' ? 'text-gray-400' : ''}`}
          >
            {r.t === 'add' ? '+' : r.t === 'del' ? '−' : ' '}
          </span>
          <span>{r.s}</span>
        </div>
      ))}
    </div>
  );
}
