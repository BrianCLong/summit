import React, { useEffect, useState, useRef } from 'react';
import $ from 'jquery';

interface AttestedNode {
  node_id: string;
  provider: string;
  measurement: string;
  verified: boolean;
}

interface DlpFinding {
  kind: string;
  severity: string;
  stepId: string;
}

interface DpBudget {
  tenant: string;
  dataset: string;
  remaining: number;
}

export default function TrustBoard() {
  const [rows, setRows] = useState<AttestedNode[]>([]);
  const [dlp, setDlp] = useState<DlpFinding[]>([]);
  const [dp, setDp] = useState<DpBudget[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlerBoundRef = useRef(false);

  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const s = new EventSource('/api/trust/stream');
    eventSourceRef.current = s;
    s.onmessage = (e) => {
      const j = JSON.parse(e.data);
      setRows(j.nodes);
      setDlp(j.dlp);
      setDp(j.dp);
    };
    return () => {
      s.close();
      eventSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!handlerBoundRef.current) {
      handlerBoundRef.current = true;
      $('#q').on('input', function () {
        const v = $(this).val()?.toString().toLowerCase() || '';
        $('.row').each(function () {
          $(this).toggle($(this).text().toLowerCase().indexOf(v) >= 0);
        });
      });
    }
    return () => {
      if (handlerBoundRef.current) {
        $('#q').off('input');
        handlerBoundRef.current = false;
      }
    };
  }, [rows.length]);
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Trust Board</h3>
        <input
          id="q"
          className="border rounded px-2 py-1"
          placeholder="filter…"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Node</th>
            <th>Provider</th>
            <th>Measurement</th>
            <th>Verified</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n: AttestedNode) => (
            <tr key={n.node_id} className="row border-b">
              <td>{n.node_id}</td>
              <td>{n.provider}</td>
              <td className="truncate">{n.measurement.slice(0, 16)}…</td>
              <td>✅</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl shadow p-3">
          <h4 className="font-semibold mb-2">DLP Incidents</h4>
          <ul className="text-sm">
            {dlp.map((d: DlpFinding, i: number) => (
              <li key={i} className="border-b py-1">
                {d.kind} • {d.severity} • {d.stepId}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl shadow p-3">
          <h4 className="font-semibold mb-2">DP Budgets</h4>
          <ul className="text-sm">
            {dp.map((b: DpBudget, i: number) => (
              <li key={i} className="border-b py-1">
                {b.tenant}/{b.dataset} • ε left {b.remaining.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
