import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface AuditEntry {
  id: string;
  resource: string;
  reason: string;
  timestamp: string;
}

interface ReasonContextValue {
  auditLog: AuditEntry[];
  requestReason: (resource: string) => Promise<string>;
}

const ReasonContext = createContext<ReasonContextValue | null>(null);

interface PromptState {
  resource: string;
  resolve: (value: string) => void;
}

export function useReasonForAccess() {
  const ctx = useContext(ReasonContext);
  if (!ctx) throw new Error('ReasonForAccessProvider missing');
  return ctx;
}

export function ReasonForAccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [isOpen, setOpen] = useState(false);

  const closePrompt = useCallback(() => setOpen(false), []);

  const fulfillPrompt = useCallback(
    (resource: string) =>
      new Promise<string>((resolve) => {
        setPrompt({ resource, resolve });
        setOpen(true);
      }),
    [],
  );

  const submitReason = useCallback(
    (reason: string) => {
      if (!prompt) return;
      const entry: AuditEntry = {
        id: `${prompt.resource}-${Date.now()}`,
        resource: prompt.resource,
        reason,
        timestamp: new Date().toISOString(),
      };
      setAuditLog((prev) => [entry, ...prev].slice(0, 50));
      prompt.resolve(reason);
      setPrompt(null);
      setOpen(false);
    },
    [prompt],
  );

  const value = useMemo(
    () => ({
      auditLog,
      requestReason: fulfillPrompt,
    }),
    [auditLog, fulfillPrompt],
  );

  return (
    <ReasonContext.Provider value={value}>
      {children}
      <ReasonForAccessModal
        open={isOpen}
        resource={prompt?.resource}
        onCancel={closePrompt}
        onSubmit={submitReason}
      />
    </ReasonContext.Provider>
  );
}

function ReasonForAccessModal({
  open,
  resource,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  resource?: string;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-50">
          Reason for access required
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Provide a justification to open{' '}
          <span className="font-medium text-white">{resource}</span>. This
          reason is recorded in the tenant-local audit log.
        </p>
        <label
          htmlFor="reason"
          className="mt-4 block text-sm font-medium text-slate-200"
        >
          Reason
        </label>
        <textarea
          id="reason"
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/80 p-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          rows={3}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (event.target.value.trim().length > 0) setError('');
          }}
        />
        {error ? <p className="mt-1 text-sm text-red-400">{error}</p> : null}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setReason('');
              setError('');
              onCancel();
            }}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition focus-visible:outline focus-visible:outline-emerald-500 focus-visible:outline-offset-2 hover:border-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!reason.trim()) {
                setError('Please provide a reason to proceed.');
                return;
              }
              onSubmit(reason.trim());
            }}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-emerald-300 focus-visible:outline-offset-2"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
