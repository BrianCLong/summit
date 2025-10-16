import React, { useRef, useState } from 'react';
import { api } from '../api';
import { useFocusTrap } from '../utils/useFocusTrap';

export default function PlaybookDialog({
  open,
  onClose,
  sig,
  providerGuess,
}: {
  open: boolean;
  onClose: () => void;
  sig: string;
  providerGuess?: string;
}) {
  const { getDLQPolicy, putDLQPolicy } = api();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pb-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        ref={ref}
        className="w-[min(560px,95vw)] rounded-2xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pb-title" className="text-lg font-semibold">
          Playbook
        </h2>
        <div className="mt-2 text-sm text-gray-700">
          <div className="mb-1">Signature</div>
          <code className="break-all text-xs">{sig}</code>
          {providerGuess && (
            <div className="mt-2 text-xs text-gray-500">
              Provider: {providerGuess}
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:bg-gray-300"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMsg(undefined);
              try {
                const pol = await getDLQPolicy();
                const set = new Set(pol.allowSignatures || []);
                set.add(sig);
                await putDLQPolicy({ allowSignatures: Array.from(set) });
                setMsg('Added to auto-replay allowlist');
              } catch (e: any) {
                setMsg(e?.message || 'Failed');
              } finally {
                setBusy(false);
              }
            }}
          >
            Allow auto-replay
          </button>
          <button className="rounded border px-3 py-2" onClick={onClose}>
            Close
          </button>
        </div>
        {msg && <div className="mt-2 text-xs text-gray-600">{msg}</div>}
      </div>
    </div>
  );
}
