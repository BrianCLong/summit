import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DocsHealth() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    async function load() {
      const idx = await import('@site/docs/ops/health/data/index.json');
      const rows: any[] = [];
      for (const f of idx.files) {
        const rec = await import(`@site/docs/ops/health/data/${f}`);
        rows.push(rec);
      }
      setData(rows);
    }
    load();
  }, []);
  if (!data.length) return null;
  return (
    <div className="grid gap-8">
      <section>
        <h3>Stale Pages Over Time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{ left: 16, right: 16, top: 16, bottom: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="staleCount" />
          </LineChart>
        </ResponsiveContainer>
      </section>
      <section className="grid md:grid-cols-2 gap-8">
        <div>
          <h3>Broken Links</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={data}
              margin={{ left: 16, right: 16, top: 16, bottom: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="brokenLinks" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h3>A11y Violations</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={data}
              margin={{ left: 16, right: 16, top: 16, bottom: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="a11y" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
