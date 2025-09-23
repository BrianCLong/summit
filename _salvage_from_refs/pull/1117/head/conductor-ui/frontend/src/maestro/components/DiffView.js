import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
export default function DiffView({ before, after }) {
  const a = (before || '').split('\n');
  const b = (after || '').split('\n');
  const rows = [];
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
  return _jsx('div', {
    className: 'max-h-72 overflow-auto rounded border font-mono text-xs',
    role: 'region',
    'aria-label': 'Diff preview',
    children: rows.map((r, idx) =>
      _jsxs(
        'div',
        {
          className: `whitespace-pre-wrap px-2 py-0.5 ${r.t === 'same' ? 'bg-white' : r.t === 'add' ? 'bg-emerald-50' : 'bg-red-50'}`,
          children: [
            _jsx('span', {
              className: `inline-block w-4 ${r.t === 'same' ? 'text-gray-400' : ''}`,
              children: r.t === 'add' ? '+' : r.t === 'del' ? '−' : ' ',
            }),
            _jsx('span', { children: r.s }),
          ],
        },
        idx,
      ),
    ),
  });
}
