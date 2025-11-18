import React, { useEffect, useState } from 'react';
import $ from 'jquery';
export default function SwarmDash() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/tgo/metrics')
      .then((r) => r.json())
      .then(setRows);
    $('#swarm-q').on('input', function (this: HTMLElement) {
      const v = $(this).val()?.toString().toLowerCase() || '';
      $('.swarm-row').each(function (this: HTMLElement) {
        $(this).toggle($(this).text().toLowerCase().includes(v));
      });
    });
  }, []);
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="font-semibold">Swarm Build Mesh</h3>
        <input
          id="swarm-q"
          className="border rounded px-2 py-1"
          placeholder="filter…"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Task</th>
            <th>Lane</th>
            <th>CAS</th>
            <th>Pool</th>
            <th>ETA</th>
            <th>Dur</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x, i) => (
            <tr key={i} className="swarm-row border-b">
              <td>{x.id}</td>
              <td>{x.lane}</td>
              <td>{x.cas ? 'hit' : 'miss'}</td>
              <td>{x.pool}</td>
              <td>{x.eta}s</td>
              <td>{x.dur}s</td>
              <td>{x.state}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
