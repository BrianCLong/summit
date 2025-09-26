import React, { useMemo, useId } from 'react';
import { useAppSelector } from '../../store/index.ts';
import { Card, CardContent, Stack, Typography, Skeleton, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSafeQuery } from '../../hooks/useSafeQuery';
import { visuallyHidden } from '@mui/utils';

export default function LatencyPanels() {
  const { tenant, status, operation } = useAppSelector((s) => s.ui);
  const { data: p95, loading: loadingP95 } = useSafeQuery<{ valueMs: number }>({
    queryKey: `p95_${tenant}_${status}_${operation}`,
    mock: { valueMs: 120.4 },
    deps: [tenant, status, operation],
  });
  const { data: trend, loading: loadingTrend } = useSafeQuery<{ ts: number; ms: number }[]>({
    queryKey: `p95_trend_${tenant}_${status}`,
    mock: Array.from({ length: 20 }).map((_, i) => ({
      ts: Date.now() - (20 - i) * 60000,
      ms: 40 + i * 5,
    })),
    deps: [tenant, status],
  });

  const latestLatency = trend?.[trend.length - 1]?.ms ?? null;
  const firstLatency = trend?.[0]?.ms ?? null;
  const trendLabelId = useId();
  const trendDescriptionId = useId();
  const latencyHeadingId = useId();

  const trendSummary = useMemo(() => {
    if (!trend || trend.length < 2) {
      return 'Latency trend data is unavailable at this time.';
    }
    const direction = latestLatency && firstLatency
      ? latestLatency > firstLatency
        ? 'increased'
        : latestLatency < firstLatency
          ? 'decreased'
          : 'remained stable'
      : 'remained stable';
    return `Latest p95 latency is ${(latestLatency ?? 0).toFixed(1)} milliseconds, which has ${direction} compared to ${(firstLatency ?? 0).toFixed(1)} milliseconds earlier in the interval.`;
  }, [firstLatency, latestLatency, trend]);

  return (
    <Stack spacing={2}>
      <Card component="section" aria-labelledby={latencyHeadingId}>
        <CardContent>
          <Typography id={latencyHeadingId} variant="subtitle2" color="text.secondary" gutterBottom>
            p95 Latency (5m) — Tenant×Status
          </Typography>
          {loadingP95 ? (
            <Skeleton height={40} width={140} aria-label="Loading p95 latency" />
          ) : (
            <Typography variant="h4" aria-live="polite">
              {p95?.valueMs.toFixed(1)} ms
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Real-time p95 latency sampled over the last five minutes for the selected tenant and status.
          </Typography>
        </CardContent>
      </Card>
      <Card component="section" aria-labelledby={trendLabelId}>
        <CardContent>
          <Typography id={trendLabelId} variant="subtitle2" color="text.secondary" gutterBottom>
            p95 Trend (5m) — Tenant×Status
          </Typography>
          <Box component="figure" sx={{ height: 220, m: 0 }}>
            <Box component="figcaption" id={trendDescriptionId} sx={visuallyHidden}>
              {trendSummary}
            </Box>
            {loadingTrend ? (
              <Skeleton variant="rounded" height={200} aria-label="Loading latency trend" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trend ?? []}
                  role="img"
                  aria-labelledby={`${trendLabelId} ${trendDescriptionId}`}
                >
                  <XAxis dataKey="ts" tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
                  <YAxis unit=" ms" />
                  <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleString()} />
                  <Line
                    type="monotone"
                    dataKey="ms"
                    stroke="#0f172a"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
