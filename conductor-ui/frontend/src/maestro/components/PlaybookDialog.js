import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useRef, useState } from 'react';
import { api } from '../api';
import { useFocusTrap } from '../utils/useFocusTrap';
export default function PlaybookDialog({ open, onClose, sig, providerGuess }) {
  const { getDLQPolicy, putDLQPolicy } = api();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(undefined);
  const ref = useRef(null);
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return _jsx('div', {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'pb-title',
    className:
      'fixed inset-0 z-50 flex items-center justify-center bg-black/40',
    onClick: onClose,
    children: _jsxs('div', {
      ref: ref,
      className: 'w-[min(560px,95vw)] rounded-2xl bg-white p-4',
      onClick: (e) => e.stopPropagation(),
      children: [
        _jsx('h2', {
          id: 'pb-title',
          className: 'text-lg font-semibold',
          children: 'Playbook',
        }),
        _jsxs('div', {
          className: 'mt-2 text-sm text-gray-700',
          children: [
            _jsx('div', { className: 'mb-1', children: 'Signature' }),
            _jsx('code', { className: 'break-all text-xs', children: sig }),
            providerGuess &&
              _jsxs('div', {
                className: 'mt-2 text-xs text-gray-500',
                children: ['Provider: ', providerGuess],
              }),
          ],
        }),
        _jsxs('div', {
          className: 'mt-3 flex gap-2',
          children: [
            _jsx('button', {
              className:
                'rounded bg-blue-600 px-3 py-2 text-white disabled:bg-gray-300',
              disabled: busy,
              onClick: async () => {
                setBusy(true);
                setMsg(undefined);
                try {
                  const pol = await getDLQPolicy();
                  const set = new Set(pol.allowSignatures || []);
                  set.add(sig);
                  await putDLQPolicy({ allowSignatures: Array.from(set) });
                  setMsg('Added to auto-replay allowlist');
                } catch (e) {
                  setMsg(e?.message || 'Failed');
                } finally {
                  setBusy(false);
                }
              },
              children: 'Allow auto-replay',
            }),
            _jsx('button', {
              className: 'rounded border px-3 py-2',
              onClick: onClose,
              children: 'Close',
            }),
          ],
        }),
        msg &&
          _jsx('div', {
            className: 'mt-2 text-xs text-gray-600',
            children: msg,
          }),
      ],
    }),
  });
}
