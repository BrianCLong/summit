import React, { useEffect, useState } from 'react';

interface Retraction {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
}

export default function RetractionQueue() {
  const [items, setItems] = useState<Retraction[]>([]);
  async function load(controller?: AbortController) {
    try {
      const r = await fetch('/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: `{ retractions { id subject status reason createdAt } }`,
        }),
        signal: controller?.signal,
      });
      const j = await r.json();
      setItems(j.data?.retractions || []);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Fetch error:', err);
      }
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller);
    const t = setInterval(() => {
      if (!controller.signal.aborted) {
        load(controller);
      }
    }, 5000);
    return () => {
      controller.abort();
      clearInterval(t);
    };
  }, []);
  return (
    <div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">Retractions</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i: Retraction) => (
            <tr key={i.id} className="border-b">
              <td className="font-mono">{String(i.id).slice(0, 6)}</td>
              <td>{i.subject}</td>
              <td>{i.status}</td>
              <td>{i.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
