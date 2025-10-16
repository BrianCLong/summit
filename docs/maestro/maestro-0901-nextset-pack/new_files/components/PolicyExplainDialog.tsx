import React from 'react';

type Explain = {
  allow: boolean;
  reasons?: string[];
  rules?: any[];
  checkedAt?: string;
};

export default function PolicyExplainDialog({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: Explain | null;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-explain-title"
    >
      <div className="bg-white rounded-2xl p-4 w-[720px] max-h-[80vh] overflow-auto shadow-xl outline-none">
        <h2 id="policy-explain-title" className="text-lg font-semibold">
          Policy Explain
        </h2>
        <div
          className={
            'mt-2 text-sm ' + (data?.allow ? 'text-green-700' : 'text-red-700')
          }
        >
          Decision: <b>{data?.allow ? 'ALLOW' : 'DENY'}</b>
        </div>
        {data?.reasons && data.reasons.length > 0 && (
          <ul className="mt-2 text-sm list-disc pl-5">
            {data.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
        {data?.rules && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm underline">
              Show full rule trace
            </summary>
            <pre className="bg-gray-50 border rounded p-2 text-xs overflow-auto mt-2">
              {JSON.stringify(data.rules, null, 2)}
            </pre>
          </details>
        )}
        <div className="mt-4 flex justify-end">
          <button
            className="border rounded px-3 py-1"
            onClick={onClose}
            autoFocus
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
