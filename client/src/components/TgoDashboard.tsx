import React, { useEffect, useState, useRef } from 'react';
import $ from 'jquery';
export default function TgoDashboard() {
  const [rows, setRows] = useState<any[]>([]);
  const handlerBoundRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/tgo/metrics', { signal: controller.signal })
      .then((r) => r.json())
      .then(setRows)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
        }
      });

    if (!handlerBoundRef.current) {
      handlerBoundRef.current = true;
      $('#tgo-q').on('input', function () {
        const v = $(this).val()?.toString().toLowerCase() || '';
        $('.tgo-row').each(function () {
          $(this).toggle($(this).text().toLowerCase().includes(v));
        });
      });
    }

    return () => {
      controller.abort();
      if (handlerBoundRef.current) {
        $('#tgo-q').off('input');
        handlerBoundRef.current = false;
      }
    };
  }, []);
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="font-semibold">Hyper-Parallel Orchestrator</h3>
        <input
          id="tgo-q"
          className="border rounded px-2 py-1"
          placeholder="filter…"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Task</th>
            <th>Pool</th>
            <th>Est(s)</th>
            <th>Dur(s)</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x, i) => (
            <tr key={i} className="tgo-row border-b">
              <td>{x.id}</td>
              <td>{x.pool}</td>
              <td>{x.est}</td>
              <td>{x.dur}</td>
              <td>{x.state}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
