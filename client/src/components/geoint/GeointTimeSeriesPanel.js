import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, Button, TextField } from '@mui/material';
import { Refresh, Timeline } from '@mui/icons-material';
import { gql, useLazyQuery } from '@apollo/client';

const GEOINT_TS_QUERY = gql`
  query GeointTimeSeries($points: JSON!, $intervalMinutes: Int) {
    geointTimeSeries(points: $points, intervalMinutes: $intervalMinutes)
  }
`;

function GeointTimeSeriesPanel({ points = null, intervalMinutes = 60, onSelectBin }) {
  const [loadTs, { data, loading }] = useLazyQuery(GEOINT_TS_QUERY);
  const [pointsText, setPointsText] = useState('');

  useEffect(() => {
    if (points && points.length) {
      loadTs({ variables: { points, intervalMinutes } });
    } else {
      // sample
      const now = Date.now();
      const sample = Array.from({ length: 12 }).map((_, i) => ({
        latitude: 40.7 + Math.sin(i/2) * 0.01,
        longitude: -74.0 + Math.cos(i/2) * 0.01,
        timestamp: new Date(now - (12 - i) * 15 * 60 * 1000).toISOString()
      }));
      loadTs({ variables: { points: sample, intervalMinutes: 30 } });
      setPointsText(JSON.stringify(sample, null, 2));
    }
  }, []);

  const series = useMemo(() => data?.geointTimeSeries || [], [data]);

  // Simple SVG line chart for averageSpeedKph
  const Chart = () => {
    const w = 320, h = 120, pad = 24;
    if (!series.length) return <Typography variant="caption">No data</Typography>;
    const xs = series.map((d, i) => i);
    const ys = series.map(d => d.averageSpeedKph || 0);
    const maxY = Math.max(1, ...ys);
    const dx = (w - pad * 2) / Math.max(1, xs.length - 1);
    const scaleY = y => h - pad - (y / maxY) * (h - pad * 2);
    const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${pad + dx * i} ${scaleY(ys[i]).toFixed(2)}`).join(' ');
    return (
      <svg width={w} height={h} role="img" aria-label="GEOINT time series">
        <rect x={0} y={0} width={w} height={h} fill="#fff" />
        <path d={path} stroke="#1976d2" fill="none" strokeWidth="2" />
        {xs.map((x, i) => (
          <circle key={i} cx={pad + dx * i} cy={scaleY(ys[i])} r={3} fill="#1976d2" onClick={() => onSelectBin && onSelectBin(series[i])} />
        ))}
        <text x={pad} y={12} fontSize="10" fill="#666">Avg speed (kph)</text>
      </svg>
    );
  };

  return (
    <Paper elevation={3} sx={{ p: 1.5, width: 360 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Timeline fontSize="small" /> GEOINT Time Series
        </Typography>
        <Tooltip title="Refresh">
          <span>
            <IconButton size="small" disabled={loading} onClick={() => {
              try {
                const parsed = JSON.parse(pointsText || '[]');
                loadTs({ variables: { points: parsed, intervalMinutes } });
              } catch {}
            }}>
              <Refresh fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Chart />
      <Box sx={{ mt: 1 }}>
        <TextField size="small" fullWidth multiline minRows={3} value={pointsText} onChange={e => setPointsText(e.target.value)} placeholder="Paste points JSON to analyze" />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button size="small" onClick={() => {
            try {
              const parsed = JSON.parse(pointsText || '[]');
              loadTs({ variables: { points: parsed, intervalMinutes } });
            } catch {}
          }}>Analyze</Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default GeointTimeSeriesPanel;

