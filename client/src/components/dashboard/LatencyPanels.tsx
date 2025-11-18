import React from 'react';
import { useAppSelector } from '../../store/index.ts';
import { Card, CardContent, Stack, Typography, Skeleton } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSafeQuery } from '../../hooks/useSafeQuery';

export default function LatencyPanels() {
  const { tenant, status, operation } = useAppSelector((s) => s.ui);
  const { data: p95, loading: loadingP95 } = useSafeQuery<{ valueMs: number }>({
    queryKey: `p95_${tenant}_${status}_${operation}`,
    mock: { valueMs: 120.4 },
    deps: [tenant, status, operation],
  });
  const { data: trend, loading: loadingTrend } = useSafeQuery<
    { ts: number; ms: number }[]
  >({
    queryKey: `p95_trend_${tenant}_${status}`,
    mock: Array.from({ length: 20 }).map((_, i) => ({
      ts: Date.now() - (20 - i) * 60000,
      ms: 40 + i * 5,
    })),
    deps: [tenant, status],
  });

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            p95 Latency (5m) — Tenant×Status
          </Typography>
          {loadingP95 ? (
            <Skeleton height={40} width={140} />
          ) : (
            <Typography variant="h4">{p95?.valueMs.toFixed(1)} ms</Typography>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            p95 Trend (5m) — Tenant×Status
          </Typography>
          <div style={{ height: 220 }}>
            {loadingTrend ? (
              <Skeleton variant="rounded" height={200} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} aria-label="p95 trend">
                  <XAxis
                    dataKey="ts"
                    tickFormatter={(v: number) => new Date(v).toLocaleTimeString()}
                  />
                  <YAxis unit=" ms" />
                  <Tooltip
                    labelFormatter={(v: number | string) => new Date(Number(v)).toLocaleString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="ms"
                    stroke="#1976d2"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </Stack>
  );
}
