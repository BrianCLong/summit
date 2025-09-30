import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Toolbar,
  Typography,
  FormControlLabel,
  Switch,
  Button,
  TextField,
  Grid,
} from '@mui/material';
import { useSelector } from 'react-redux';
import GeoMapPanel from './GeoMapPanel';
import { GeointAPI } from '../../services/api';
import GeointTimeSeriesPanel from './GeointTimeSeriesPanel';

export default function GeoMapPage() {
  const nodes = useSelector((s) => s.graph.nodes || []);
  const selected = useSelector((s) => s.graph.selectedNodes || []);
  const [showHeat, setShowHeat] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [clusterPolygons, setClusterPolygons] = useState([]);
  const [epsilonKm, setEpsilonKm] = useState(0.5);
  const [minPoints, setMinPoints] = useState(3);
  const [useSelectedOnly, setUseSelectedOnly] = useState(false);
  const [timeWindow, setTimeWindow] = useState(null); // {start, end}

  const baseNodes = useMemo(
    () => (useSelectedOnly && selected?.length ? selected : nodes),
    [useSelectedOnly, selected, nodes],
  );
  const locPointsRaw = useMemo(
    () =>
      (baseNodes || [])
        .map((n) => n.data || n)
        .filter((n) => n.type === 'LOCATION' && n.properties?.latitude && n.properties?.longitude)
        .map((n) => ({ latitude: n.properties.latitude, longitude: n.properties.longitude })),
    [nodes],
  );
  const locPoints = useMemo(() => {
    if (!timeWindow) return locPointsRaw;
    // Filter by timestamp if available on node properties
    const [startMs, endMs] = [Date.parse(timeWindow.start), Date.parse(timeWindow.end)];
    return (baseNodes || [])
      .map((n) => n.data || n)
      .filter((n) => n.type === 'LOCATION' && n.properties?.latitude && n.properties?.longitude)
      .filter((n) => {
        const ts = n.properties?.timestamp ? Date.parse(n.properties.timestamp) : null;
        if (!ts || isNaN(ts)) return true; // if no timestamp, keep by default
        return ts >= startMs && ts <= endMs;
      })
      .map((n) => ({ latitude: n.properties.latitude, longitude: n.properties.longitude }));
  }, [locPointsRaw, baseNodes, timeWindow]);

  function convexHull(points) {
    if (points.length < 3) return points;
    const pts = points
      .map((p) => ({ x: p.longitude, y: p.latitude }))
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
        lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
        upper.pop();
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    const hull = lower.concat(upper);
    return hull.map((p) => [p.y, p.x]); // return as [lat, lon]
  }

  const runClusters = async () => {
    try {
      const res = await GeointAPI.clusters({
        points: locPoints,
        epsilonKm: Number(epsilonKm),
        minPoints: Number(minPoints),
      });
      const mapped = (res.clusters || []).map((clusterArr) => {
        // centroid
        const lat = clusterArr.reduce((a, p) => a + p.latitude, 0) / clusterArr.length;
        const lon = clusterArr.reduce((a, p) => a + p.longitude, 0) / clusterArr.length;
        return { centroid: { latitude: lat, longitude: lon }, size: clusterArr.length };
      });
      setClusters(mapped);
      const polys = (res.clusters || [])
        .filter((c) => c.length >= 3)
        .map((clusterArr) => convexHull(clusterArr));
      setClusterPolygons(polys);
    } catch (e) {
      setClusters([]);
    }
  };

  useEffect(() => {
    if (locPoints.length) runClusters();
  }, [locPoints.length]);

  return (
    <Box sx={{ height: 'calc(100vh - 120px)' }}>
      <Toolbar sx={{ pl: 0, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Geo Map
        </Typography>
        <FormControlLabel
          control={<Switch checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />}
          label="Heat"
        />
        <FormControlLabel
          control={
            <Switch
              checked={useSelectedOnly}
              onChange={(e) => setUseSelectedOnly(e.target.checked)}
            />
          }
          label="Use selected"
        />
        <TextField
          size="small"
          sx={{ mx: 1, width: 150 }}
          label="Epsilon (km)"
          value={epsilonKm}
          onChange={(e) => setEpsilonKm(e.target.value)}
        />
        <TextField
          size="small"
          sx={{ mr: 1, width: 150 }}
          label="Min Points"
          value={minPoints}
          onChange={(e) => setMinPoints(e.target.value)}
        />
        <TextField
          size="small"
          sx={{ mr: 1, width: 220 }}
          label="Start (ISO)"
          value={timeWindow?.start || ''}
          onChange={(e) => setTimeWindow((w) => ({ ...(w || {}), start: e.target.value }))}
        />
        <TextField
          size="small"
          sx={{ mr: 1, width: 220 }}
          label="End (ISO)"
          value={timeWindow?.end || ''}
          onChange={(e) => setTimeWindow((w) => ({ ...(w || {}), end: e.target.value }))}
        />
        <Button variant="outlined" onClick={() => setTimeWindow(null)}>
          Clear window
        </Button>
        <Button variant="outlined" onClick={runClusters} disabled={!locPoints.length}>
          Cluster
        </Button>
      </Toolbar>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        <Grid item xs={12} md={8} sx={{ height: '100%' }}>
          <Paper variant="outlined" sx={{ height: '100%', minHeight: 420, overflow: 'hidden' }}>
            <GeoMapPanel
              nodes={baseNodes}
              showHeat={showHeat}
              clusters={clusters}
              clusterPolygons={clusterPolygons}
              contours={clusters.map((c) => [
                {
                  lat: c.centroid.latitude,
                  lon: c.centroid.longitude,
                  radiusM: 400 * Math.sqrt(c.size || 1),
                },
                {
                  lat: c.centroid.latitude,
                  lon: c.centroid.longitude,
                  radiusM: 250 * Math.sqrt(c.size || 1),
                },
                {
                  lat: c.centroid.latitude,
                  lon: c.centroid.longitude,
                  radiusM: 150 * Math.sqrt(c.size || 1),
                },
              ])}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <GeointTimeSeriesPanel
            points={locPoints.map((p, i) => ({
              ...p,
              timestamp: new Date(Date.now() - (locPoints.length - i) * 600000).toISOString(),
            }))}
            intervalMinutes={30}
            onSelectBin={(bin) => setTimeWindow({ start: bin.start, end: bin.end })}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
