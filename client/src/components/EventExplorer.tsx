import React, { useEffect, useState } from 'react';
import $ from 'jquery';

interface Partition {
  id: string;
  offset: number;
  lag: number;
}

interface EventStats {
  lag: number;
  partitions: Partition[];
}

export default function EventExplorer({ sourceId }: { sourceId: string }) {
  const [stats, setStats] = useState<EventStats>({ lag: 0, partitions: [] });
  useEffect(() => {
    const s = new EventSource(`/api/events/${sourceId}/stats`);
    s.onmessage = (e) => setStats(JSON.parse(e.data));
    return () => s.close();
  }, [sourceId]);
  useEffect(() => {
    const h = function (this: HTMLInputElement) {
      const v = Number(this.value || 0);
      ($('.p-row') as JQuery<HTMLElement>).each(function () {
        const lag = Number($(this).data('lag') || 0);
        $(this).toggle(lag >= v);
      });
    };
    $('#lagFilter').on('input', h);
    return () => $('#lagFilter').off('input', h);
  }, [stats.partitions.length]);
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Event Explorer</h3>
        <input
          id="lagFilter"
          type="number"
          className="border rounded px-2 py-1"
          placeholder="min lag…"
        />
        <button
          onClick={() =>
            fetch(`/api/events/${sourceId}/pause`, { method: 'POST' })
          }
          className="px-2 py-1 rounded-2xl shadow"
        >
          Pause
        </button>
        <button
          onClick={() =>
            fetch(`/api/events/${sourceId}/resume`, { method: 'POST' })
          }
          className="px-2 py-1 rounded-2xl shadow"
        >
          Resume
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Partition</th>
            <th>Offset</th>
            <th>Lag</th>
          </tr>
        </thead>
        <tbody>
          {stats.partitions.map((p: Partition) => (
            <tr key={p.id} className="p-row border-b" data-lag={p.lag}>
              <td>{p.id}</td>
              <td>{p.offset}</td>
              <td>{p.lag}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
