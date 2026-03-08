import React from 'react';

export function ExplainDrawer(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  disclaimers: string[];
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-xl bg-midnight p-6 text-sand">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{props.title}</h2>
          <button className="rounded-full border px-3 py-1 text-xs" onClick={props.onClose}>
            Close
          </button>
        </div>

        <pre className="mt-4 whitespace-pre-wrap text-sm">{props.body}</pre>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-sand/75">
          {props.disclaimers.map((disclaimer) => (
            <li key={disclaimer}>{disclaimer}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
