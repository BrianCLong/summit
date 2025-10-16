import React, { useEffect, useState } from 'react';
import $ from 'jquery';
export default function ContractsPanel() {
  const [c, setC] = useState<any | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/contracts/current', { signal: controller.signal })
      .then((r) => r.json())
      .then(setC)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
        }
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold mb-2">Change Contract</h3>
      {!c ? (
        <div>loading…</div>
      ) : (
        <ul className="text-sm">
          <li>Area: {c.area}</li>
          <li>Intent: {c.intent}</li>
          <li>Budget p95: {c.budgets.p95_ms}ms</li>
          <li>Error: {c.budgets.err_rate_pct}%</li>
        </ul>
      )}
    </div>
  );
}
