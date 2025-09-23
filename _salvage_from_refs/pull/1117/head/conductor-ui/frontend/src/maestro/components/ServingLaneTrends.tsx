import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function ServingLaneTrends() {
  const { getServingMetrics } = api();
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await getServingMetrics();
        const s = (r.series || []).map((p: any) => ({
          t: new Date(p.ts).toLocaleTimeString(),
          ...p,
        }));
        setData(s);
      } catch {}
    })();
  }, []);
  if (!data.length) return null;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Card title="Queue depth">
        <Chart data={data} k="qDepth" />
      </Card>
      <Card title="Batch size">
        <Chart data={data} k="batch" />
      </Card>
      <Card title="KV cache hit">
        <Chart data={data} k="kvHit" />
      </Card>
    </div>
  );
}

function Chart({ data, k }: { data: any[]; k: string }) {
  return (
    <div style={{ height: 140 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <XAxis dataKey="t" hide />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={k} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="mb-2 text-sm text-gray-600">{title}</div>
      {children}
    </div>
  );
}
