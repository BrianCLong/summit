import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useRef, useState } from 'react';
import DiffView from './DiffView';
import { useFocusTrap } from '../utils/useFocusTrap';
export default function AgentEditDialog({ open, onClose, original, onApprove }) {
  const [draft, setDraft] = useState(original);
  const [busy, setBusy] = useState(false);
  const root = useRef(null);
  useFocusTrap(root, open);
  useEffect(() => {
    if (open) setDraft(original);
  }, [open, original]);
  if (!open) return null;
  return _jsx('div', {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'agent-edit-title',
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/40',
    children: _jsxs('div', {
      ref: root,
      className: 'w-[min(720px,95vw)] rounded-2xl bg-white p-4 shadow-xl',
      children: [
        _jsx('h2', {
          id: 'agent-edit-title',
          className: 'text-lg font-semibold',
          children: 'Edit & approve step',
        }),
        _jsxs('div', {
          className: 'mt-2 grid grid-cols-1 gap-3 md:grid-cols-2',
          children: [
            _jsxs('div', {
              children: [
                _jsx('div', { className: 'mb-1 text-sm text-gray-600', children: 'Draft' }),
                _jsx('textarea', {
                  'aria-label': 'Draft text',
                  className: 'h-48 w-full rounded border p-2',
                  value: draft,
                  onChange: (e) => setDraft(e.target.value),
                }),
              ],
            }),
            _jsxs('div', {
              children: [
                _jsx('div', {
                  className: 'mb-1 text-sm text-gray-600',
                  children: 'Diff (before \u2192 after)',
                }),
                _jsx(DiffView, { before: original, after: draft }),
              ],
            }),
          ],
        }),
        _jsxs('div', {
          className: 'mt-3 flex justify-end gap-2',
          children: [
            _jsx('button', {
              className: 'rounded border px-3 py-2',
              onClick: onClose,
              children: 'Cancel',
            }),
            _jsx('button', {
              disabled: busy,
              className: 'rounded bg-emerald-600 px-3 py-2 text-white',
              onClick: async () => {
                setBusy(true);
                try {
                  await onApprove(draft);
                  onClose();
                } finally {
                  setBusy(false);
                }
              },
              children: 'Approve & apply',
            }),
          ],
        }),
      ],
    }),
  });
}
