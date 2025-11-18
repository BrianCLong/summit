import React, { useEffect, useState } from 'react';
import $ from 'jquery';
export default function ArtifactBusPanel() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/oci/metrics')
      .then((r) => r.json())
      .then(setRows);
    $('#ab-q').on('input', function (this: HTMLElement) {
      const v = ($(this).val() || '').toString().toLowerCase();
      $('.ab-row').each(function (this: HTMLElement) {
        $(this).toggle($(this).text().toLowerCase().includes(v));
      });
    });
  }, []);
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="font-semibold">OCI Artifact Bus</h3>
        <input
          id="ab-q"
          className="border rounded px-2 py-1"
          placeholder="filter…"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Kind</th>
            <th>Bytes</th>
            <th>Hits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x: any, i: number) => (
            <tr key={i} className="ab-row border-b">
              <td>{x.tag.slice(0, 16)}…</td>
              <td>{x.kind}</td>
              <td>{x.size}</td>
              <td>{x.hits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
