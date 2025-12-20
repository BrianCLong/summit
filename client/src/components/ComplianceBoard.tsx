import React, { useEffect, useState } from 'react';
import $ from 'jquery';

interface ComplianceControl {
  id: string;
  status: string;
  evidenceUri: string;
}

export default function ComplianceBoard() {
  const [rows, setRows] = useState<ComplianceControl[]>([]);
  useEffect(() => {
    fetch('/api/compliance/controls')
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  useEffect(() => {
    const handler = function (this: HTMLInputElement) {
      const v = this.value?.toString().toLowerCase() || '';
      ($(this) as JQuery<HTMLElement>).each(function () {
        const $row = $(this);
        $row.toggle($row.text().toLowerCase().indexOf(v) >= 0);
      });
    };
    $('#ctrlFilter').on('input', handler);
    return () => {
      $('#ctrlFilter').off('input', handler);
    };
  }, [rows.length]);

  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Compliance Controls</h3>
        <input
          id="ctrlFilter"
          className="border rounded px-2 py-1"
          placeholder="filter…"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Control</th>
            <th>Status</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c: ComplianceControl) => (
            <tr key={c.id} className="ctrl-row border-b">
              <td>{c.id}</td>
              <td>{c.status}</td>
              <td>
                <a className="underline" href={c.evidenceUri}>
                  evidence
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
