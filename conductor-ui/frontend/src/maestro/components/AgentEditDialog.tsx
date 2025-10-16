import React, { useEffect, useRef, useState } from 'react';
import DiffView from './DiffView';
import { useFocusTrap } from '../utils/useFocusTrap';

export default function AgentEditDialog({
  open,
  onClose,
  original,
  onApprove,
}: {
  open: boolean;
  onClose: () => void;
  original: string;
  onApprove: (patched: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(original);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useFocusTrap(root, open);
  useEffect(() => {
    if (open) setDraft(original);
  }, [open, original]);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-edit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div
        ref={root}
        className="w-[min(720px,95vw)] rounded-2xl bg-white p-4 shadow-xl"
      >
        <h2 id="agent-edit-title" className="text-lg font-semibold">
          Edit & approve step
        </h2>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-sm text-gray-600">Draft</div>
            <textarea
              aria-label="Draft text"
              className="h-48 w-full rounded border p-2"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <div>
            <div className="mb-1 text-sm text-gray-600">
              Diff (before → after)
            </div>
            <DiffView before={original} after={draft} />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded border px-3 py-2" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={busy}
            className="rounded bg-emerald-600 px-3 py-2 text-white"
            onClick={async () => {
              setBusy(true);
              try {
                await onApprove(draft);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            Approve & apply
          </button>
        </div>
      </div>
    </div>
  );
}
