import React, { useEffect, useState } from 'react';
import $ from 'jquery';

interface Candidate {
  id: string;
  type: string;
  subjectA: string;
  subjectB: string;
  score: number;
  explain: Record<string, unknown>;
}

export default function InsightStudio({ runId }: { runId: string }) {
  const [cands, setCands] = useState<Candidate[]>([]);
  const [sel, setSel] = useState<Candidate | null>(null);
  useEffect(() => {
    fetch(`/api/runs/${runId}/candidates`)
      .then((r) => r.json())
      .then(setCands);
  }, [runId]);
  useEffect(() => {
    const h = function (this: HTMLInputElement) {
      const v = this.value?.toString().toLowerCase() || '';
      ($('.row') as JQuery<HTMLElement>).each(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(v) >= 0);
      });
    };
    $('#q').on('input', h);
    return () => $('#q').off('input', h);
  }, [cands.length]);
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <div className="col-span-1 rounded-2xl shadow p-3">
        <div className="flex gap-2 mb-2">
          <h3 className="text-lg font-semibold">AI Suggestions</h3>
          <input
            id="q"
            className="border rounded px-2 py-1"
            placeholder="filter…"
          />
        </div>
        <ul className="text-sm">
          {cands.map((c: Candidate) => (
            <li
              key={c.id}
              className="row py-1 border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => setSel(c)}
            >
              {c.type} • {c.subjectA} ⇄ {c.subjectB} • score{' '}
              {Number(c.score || 0).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
      <div className="col-span-1 rounded-2xl shadow p-3">
        {sel ? (
          <div>
            <h3 className="text-lg font-semibold">Explain</h3>
            <pre className="text-xs bg-gray-50 p-2 rounded">
              {JSON.stringify(sel.explain, null, 2)}
            </pre>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => act(true)}
                className="px-3 py-1 rounded-2xl shadow"
              >
                Approve
              </button>
              <button
                onClick={() => act(false)}
                className="px-3 py-1 rounded-2xl shadow"
              >
                Decline
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            Select a suggestion to review…
          </div>
        )}
      </div>
    </div>
  );

  async function act(ok: boolean) {
    const reason = prompt('Reason?') || '';
    await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `mutation { aiFeedback(runId:"${runId}", stepId:"infer_candidates", subjectId:"${sel?.id}", decision:"${ok ? 'approve' : 'decline'}", reason:${JSON.stringify(reason)} ) }`,
      }),
    });
    ($('#q') as JQuery<HTMLElement>).val('');
  }
}
