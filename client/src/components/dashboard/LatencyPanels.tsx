import React from 'react';
import { useAppSelector } from '../../store/index.ts';
import { Card, CardContent, Stack, Typography, Skeleton, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSafeQuery } from '../../hooks/useSafeQuery';

interface LatencyPanelsProps {
  headingId?: string;
}

export default function LatencyPanels({ headingId = 'latency-panels-heading' }: LatencyPanelsProps) {
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

  const summaryId = `${headingId}-summary`;
  const chartDescriptionId = `${headingId}-chart-desc`;

  return (
    <Stack spacing={2} aria-labelledby={headingId} component="section">
      <Typography id={headingId} variant="h6" component="h2" sx={{ fontWeight: 600 }}>
        Latency insights
      </Typography>
      <Card component="article" aria-labelledby={`${headingId}-current`}>
        <CardContent>
          <Typography
            id={`${headingId}-current`}
            variant="subtitle2"
            sx={{ color: 'text.primary', fontWeight: 600 }}
          >
            p95 Latency (5m) — Tenant×Status
          </Typography>
          {loadingP95 ? (
            <Skeleton height={40} width={140} role="status" aria-live="polite" />
          ) : (
            <Typography variant="h4" component="p" sx={{ color: 'text.primary', fontWeight: 700 }}>
              {p95?.valueMs.toFixed(1)} ms
            </Typography>
          )}
          <Typography id={summaryId} variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Current aggregate latency across tenant and status filters. Values update automatically
            as filters change.
          </Typography>
        </CardContent>
      </Card>
      <Card component="article" aria-labelledby={`${headingId}-trend`}>
        <CardContent>
          <Typography
            id={`${headingId}-trend`}
            variant="subtitle2"
            sx={{ color: 'text.primary', fontWeight: 600 }}
          >
            p95 Trend (5m) — Tenant×Status
          </Typography>
          <Box
            role="img"
            aria-describedby={chartDescriptionId}
            tabIndex={0}
            sx={{
              height: 220,
              outline: 'none',
              '&:focus-visible': {
                boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}`,
              },
            }}
          >
            {loadingTrend ? (
              <Skeleton
                variant="rounded"
                height={200}
                role="status"
                aria-live="polite"
                aria-label="Loading latency trend"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} aria-hidden="true">
                  <XAxis dataKey="ts" tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
                  <YAxis unit=" ms" stroke="#374151" />
                  <Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleString()} />
                  <Line
                    type="monotone"
                    dataKey="ms"
                    stroke="#0b5cab"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>
          <Typography id={chartDescriptionId} variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Trend line showing the last {trend?.length ?? 0} measurements. Focus the chart region to
            hear a concise summary with assistive technology.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
