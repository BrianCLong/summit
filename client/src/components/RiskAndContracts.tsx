import React, { useEffect, useState, useRef } from 'react';
import $ from 'jquery';
export default function RiskAndContracts() {
  const [h, setH] = useState<string>('');
  const [c, setC] = useState<any>(null);
  const handlerBoundRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch('/api/pm/heatmap', { signal: controller.signal }).then((r) =>
        r.text(),
      ),
      fetch('/api/contracts/current', { signal: controller.signal }).then((r) =>
        r.json(),
      ),
    ])
      .then(([heatmapData, contractData]) => {
        setH(heatmapData);
        setC(contractData);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!handlerBoundRef.current && h) {
      handlerBoundRef.current = true;
      $('#risk-q').on('input', function (this: HTMLElement) {
        const v = ($(this).val() || '').toString().toLowerCase();
        $('.risk-row').each(function (this: HTMLElement) {
          $(this).toggle($(this).text().toLowerCase().includes(v));
        });
      });
    }
    return () => {
      if (handlerBoundRef.current) {
        $('#risk-q').off('input');
        handlerBoundRef.current = false;
      }
    };
  }, [h]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="p-4 rounded-2xl shadow">
        <div className="flex gap-2 mb-2">
          <h3 className="font-semibold">Risk Heatmap</h3>
          <input
            id="risk-q"
            className="border rounded px-2 py-1"
            placeholder="filter…"
          />
        </div>
        <pre className="text-xs whitespace-pre-wrap">{h}</pre>
      </div>
      <div className="p-4 rounded-2xl shadow">
        <h3 className="font-semibold mb-2">Change Contract</h3>
        {!c ? (
          <div>loading…</div>
        ) : (
          <ul className="text-sm">
            <li>Area: {c.area}</li>
            <li>Intent: {c.intent}</li>
            <li>p95 ≤ {c.budgets.p95_ms}ms</li>
            <li>Error ≤ {c.budgets.err_rate_pct}%</li>
          </ul>
        )}
      </div>
    </div>
  );
}
