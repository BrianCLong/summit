import React, { useMemo, useState, useEffect } from 'react';
import { Box, Paper, Toolbar, Typography, FormControlLabel, Switch, Button, TextField } from '@mui/material';
import { useSelector } from 'react-redux';
import GeoMapPanel from './GeoMapPanel';
import { GeointAPI } from '../../services/api';

export default function GeoMapPage() {
  const nodes = useSelector((s) => s.graph.nodes || []);
  const [showHeat, setShowHeat] = useState(true);
  const [clusters, setClusters] = useState([]);
  const [epsilonKm, setEpsilonKm] = useState(0.5);
  const [minPoints, setMinPoints] = useState(3);

  const locPoints = useMemo(() => (nodes || []).map(n => n.data || n)
    .filter(n => n.type === 'LOCATION' && n.properties?.latitude && n.properties?.longitude)
    .map(n => ({ latitude: n.properties.latitude, longitude: n.properties.longitude })), [nodes]);

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
    } catch (e) { setClusters([]); }
  };

  useEffect(() => { if (locPoints.length) runClusters(); }, [locPoints.length]);

  return (
    <Box sx={{ height: 'calc(100vh - 120px)' }}>
      <Toolbar sx={{ pl: 0 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Geo Map</Typography>
        <FormControlLabel control={<Switch checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />} label="Heat" />
        <TextField size="small" sx={{ mx: 1, width: 110 }} label="Epsilon (km)" value={epsilonKm} onChange={(e) => setEpsilonKm(e.target.value)} />
        <TextField size="small" sx={{ mr: 1, width: 110 }} label="Min Points" value={minPoints} onChange={(e) => setMinPoints(e.target.value)} />
        <Button variant="outlined" onClick={runClusters} disabled={!locPoints.length}>Cluster</Button>
      </Toolbar>
      <Paper variant="outlined" sx={{ height: '100%', overflow: 'hidden' }}>
        <GeoMapPanel nodes={nodes} showHeat={showHeat} clusters={clusters} />
      </Paper>
    </Box>
  );
}

