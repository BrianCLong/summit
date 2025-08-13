import React, { useMemo, useState, useEffect } from 'react';
import { Box, Paper, Toolbar, Typography, FormControlLabel, Switch, Button, TextField } from '@mui/material';
import { useSelector } from 'react-redux';
import GeoMapPanel from './GeoMapPanel';
import { GeointAPI } from '../../services/api';

export default function GeoMapPage() {
  const nodes = useSelector((s) => s.graph.nodes || []);
  const selected = useSelector((s) => s.graph.selectedNodes || []);
  const [showHeat, setShowHeat] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [clusterPolygons, setClusterPolygons] = useState([]);
  const [epsilonKm, setEpsilonKm] = useState(0.5);
  const [minPoints, setMinPoints] = useState(3);
  const [useSelectedOnly, setUseSelectedOnly] = useState(false);

  const baseNodes = useMemo(() => (useSelectedOnly && selected?.length ? selected : nodes), [useSelectedOnly, selected, nodes]);
  const locPoints = useMemo(() => (baseNodes || []).map(n => n.data || n)
    .filter(n => n.type === 'LOCATION' && n.properties?.latitude && n.properties?.longitude)
    .map(n => ({ latitude: n.properties.latitude, longitude: n.properties.longitude })), [nodes]);

  function convexHull(points) {
    if (points.length < 3) return points;
    const pts = points.map(p => ({ x: p.longitude, y: p.latitude })).sort((a,b)=> a.x===b.x? a.y-b.y : a.x-b.x);
    const cross = (o,a,b) => (a.x-o.x)*(b.y-o.y) - (a.y-o.y)*(b.x-o.x);
    const lower = [];
    for (const p of pts) { while (lower.length>=2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop(); lower.push(p); }
    const upper = [];
    for (let i=pts.length-1;i>=0;i--) { const p=pts[i]; while (upper.length>=2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop(); upper.push(p); }
    upper.pop(); lower.pop();
    const hull = lower.concat(upper);
    return hull.map(p => [p.y, p.x]); // return as [lat, lon]
  }

  const runClusters = async () => {
    try {
      const res = await GeointAPI.clusters({ points: locPoints, epsilonKm: Number(epsilonKm), minPoints: Number(minPoints) });
      const mapped = (res.clusters || []).map(clusterArr => {
        // centroid
        const lat = clusterArr.reduce((a, p) => a + p.latitude, 0) / clusterArr.length;
        const lon = clusterArr.reduce((a, p) => a + p.longitude, 0) / clusterArr.length;
        return { centroid: { latitude: lat, longitude: lon }, size: clusterArr.length };
      });
      setClusters(mapped);
      const polys = (res.clusters || []).filter(c => c.length>=3).map(clusterArr => convexHull(clusterArr));
      setClusterPolygons(polys);
    } catch (e) { setClusters([]); }
  };

  useEffect(() => { if (locPoints.length) runClusters(); }, [locPoints.length]);

  return (
    <Box sx={{ height: 'calc(100vh - 120px)' }}>
      <Toolbar sx={{ pl: 0 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Geo Map</Typography>
        <FormControlLabel control={<Switch checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />} label="Heat" />
        <FormControlLabel control={<Switch checked={useSelectedOnly} onChange={(e)=> setUseSelectedOnly(e.target.checked)} />} label="Use selected" />
        <TextField size="small" sx={{ mx: 1, width: 110 }} label="Epsilon (km)" value={epsilonKm} onChange={(e) => setEpsilonKm(e.target.value)} />
        <TextField size="small" sx={{ mr: 1, width: 110 }} label="Min Points" value={minPoints} onChange={(e) => setMinPoints(e.target.value)} />
        <Button variant="outlined" onClick={runClusters} disabled={!locPoints.length}>Cluster</Button>
      </Toolbar>
      <Paper variant="outlined" sx={{ height: '100%', overflow: 'hidden' }}>
        <GeoMapPanel nodes={baseNodes} showHeat={showHeat} clusters={clusters} clusterPolygons={clusterPolygons} />
      </Paper>
    </Box>
  );
}
