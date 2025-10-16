import React, { useEffect, useState } from 'react';
import { api } from '../api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

export default function TenantSLOChart({ tenant }: { tenant: string }) {
  const { getSLOTimeSeriesByTenant } = api();
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    getSLOTimeSeriesByTenant(tenant).then((r) => {
      setData(
        r.points.map((p: any) => ({
          time: new Date(p.ts).toLocaleTimeString(),
          ...p,
        })),
      );
    });
  }, [tenant]);
  return (
    <div className="rounded-2xl border p-3">
      <div className="mb-2 text-sm text-gray-600">
        Tenant “{tenant}” — burn over time
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 'dataMax+0.5']} />
            <Tooltip />
            <Legend />
            <ReferenceLine y={1} strokeDasharray="3 3" />
            <ReferenceLine y={2} strokeDasharray="3 3" />
            <Line
              type="monotone"
              dot={false}
              dataKey="fastBurn"
              name="Fast burn (1h)"
            />
            <Line
              type="monotone"
              dot={false}
              dataKey="slowBurn"
              name="Slow burn (6h)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
