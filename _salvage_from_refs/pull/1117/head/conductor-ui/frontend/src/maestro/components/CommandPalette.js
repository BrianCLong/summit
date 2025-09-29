import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';
import { useFocusTrap } from '../utils/useFocusTrap';
import { Link } from 'react-router-dom';
export default function CommandPalette({ open, onClose }) {
  const ref = React.useRef(null);
  useFocusTrap(ref, open, onClose);
  const [q, setQ] = React.useState('');
  const items = [
    { label: 'Go: Home', href: '/maestro/' },
    { label: 'Go: Runs', href: '/maestro/runs' },
    { label: 'Go: Pipelines', href: '/maestro/pipelines' },
    { label: 'Go: Autonomy & Guardrails', href: '/maestro/autonomy' },
    { label: 'Go: Recipes', href: '/maestro/recipes' },
    { label: 'Go: Observability & SLOs', href: '/maestro/observability' },
    { label: 'Go: Costs & Budgets', href: '/maestro/cost' },
    { label: 'Go: CI/CD & Environments', href: '/maestro/cicd' },
    { label: 'Go: Tickets', href: '/maestro/tickets' },
    { label: 'Go: Admin Studio', href: '/maestro/admin' },
  ];
  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
  if (!open) return null;
  return _jsx('div', {
    role: 'dialog',
    'aria-modal': 'true',
    className: 'fixed inset-0 z-[100] flex items-start justify-center bg-black/30 pt-24',
    'aria-label': 'Command palette',
    onClick: onClose,
    children: _jsxs('div', {
      ref: ref,
      className: 'w-full max-w-2xl rounded-lg border bg-white shadow-xl',
      onClick: (e) => e.stopPropagation(),
      children: [
        _jsx('div', {
          className: 'border-b p-3',
          children: _jsx('input', {
            autoFocus: true,
            'aria-label': 'Command search',
            className: 'w-full rounded border px-3 py-2 outline-none',
            placeholder: 'Type a command or search (e.g., Runs)',
            value: q,
            onChange: (e) => setQ(e.target.value),
          }),
        }),
        _jsxs('ul', {
          className: 'max-h-[50vh] overflow-auto p-2',
          children: [
            filtered.map((i) =>
              _jsx(
                'li',
                {
                  children: _jsx(Link, {
                    className: 'block rounded px-3 py-2 text-sm hover:bg-slate-100',
                    to: i.href,
                    onClick: onClose,
                    children: i.label,
                  }),
                },
                i.href,
              ),
            ),
            filtered.length === 0 &&
              _jsx('li', {
                className: 'px-3 py-6 text-center text-sm text-slate-500',
                children: 'No matches',
              }),
          ],
        }),
        _jsx('div', {
          className: 'border-t px-3 py-1 text-[11px] text-slate-500',
          children:
            'Shortcuts: \u2318K open \u2022 g r = Runs \u2022 g o = Observability \u2022 g t = Tickets',
        }),
      ],
    }),
  });
}
