import React, { useEffect, useState } from 'react';
import $ from 'jquery';

interface OrchestratedAnswer {
  id: string;
  answer: string;
  claims: unknown; // Changed from any to unknown
  citations: Citation[];
  consensusScore: number;
  conflicts: unknown; // Changed from any to unknown
}

interface Citation {
  url: string;
  licenseId?: string;
}

export default function MaestroAnswerPanel() {
  const [data, setData] = useState<OrchestratedAnswer | null>(null);
  useEffect(() => {
    // demo query
    const q = `mutation{ orchestratedAnswer(question:"What changed in latest release?", contextId:"ctx1"){answer, citations{url}, consensusScore, conflicts} }`;
    $.ajax({
      url: '/graphql',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ query: q }),
    }).done((r) => setData(r.data.orchestratedAnswer));
  }, []);
  if (!data) return <div className="p-6">Loading…</div>;
  return (
    <div className="p-6 space-y-4">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-xl font-semibold">Synthesized Answer</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm">{data.answer}</pre>
        <div className="mt-2 text-xs text-gray-600">
          Consensus: {(data.consensusScore * 100).toFixed(1)}%
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold">Citations</h3>
        <ul className="list-disc ml-5">
          {data.citations.map((c: Citation, i: number) => (
            <li key={i}>
              <a
                className="text-blue-600 underline"
                href={c.url}
                target="_blank"
                rel="noreferrer"
              >
                {c.url}
              </a>
            </li>
          ))}
        </ul>
      </div>
      {data.conflicts?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl p-3">
          <b>Conflicts detected:</b> {data.conflicts.length}. See Maestro Panel
          → Conflicts.
        </div>
      )}
    </div>
  );
}
