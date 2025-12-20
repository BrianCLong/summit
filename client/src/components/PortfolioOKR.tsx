import React, { useEffect, useState } from 'react';
import $ from 'jquery';
export default function PortfolioOKR() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/pm/okr/summary', { signal: controller.signal })
      .then((r) => r.json())
      .then(setRows)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
        }
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold mb-2">OKR Portfolio</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Objective</th>
            <th>KR</th>
            <th>Progress</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr key={i} className="border-b">
              <td>{r.obj}</td>
              <td>{r.kr}</td>
              <td>{r.pct}%</td>
              <td>{r.risk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
