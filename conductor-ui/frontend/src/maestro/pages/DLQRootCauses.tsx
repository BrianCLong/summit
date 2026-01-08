import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function DLQRootCauses() {
  const { getDLQRootCauses } = api();
  const [groups, setGroups] = useState<any[]>([]);
  const [since, setSince] = useState<number>(7 * 24 * 3600 * 1000);
  useEffect(() => {
    getDLQRootCauses({ sinceMs: since }).then((r) => setGroups(r.groups || []));
  }, [since]);
  return (
    <section className="space-y-3 p-4" aria-label="DLQ Root Causes">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Root Causes</h1>
        <select
          className="rounded border px-2 py-1"
          value={since}
          onChange={(e) => setSince(Number(e.target.value))}
          aria-label="Since"
        >
          <option value={24 * 3600 * 1000}>Last 24h</option>
          <option value={3 * 24 * 3600 * 1000}>Last 3d</option>
          <option value={7 * 24 * 3600 * 1000}>Last 7d</option>
        </select>
      </div>
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th>Count</th>
            <th>Step</th>
            <th>Kind</th>
            <th>Provider</th>
            <th>Last seen</th>
            <th>Signature</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={`${g.stepId}|${g.kind}|${g.provider}`}>
              <td>{g.count}</td>
              <td>{g.stepId}</td>
              <td>{g.kind}</td>
              <td>{g.provider}</td>
              <td>{new Date(g.lastTs).toLocaleString()}</td>
              <td title={g.sampleError} className="max-w-[560px] truncate">
                {g.signature}
              </td>
            </tr>
          ))}
          {!groups.length && (
            <tr>
              <td colSpan={6} className="p-3 text-center text-gray-500">
                No groups
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
