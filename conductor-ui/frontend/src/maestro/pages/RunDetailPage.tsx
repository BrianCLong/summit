import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Grid,
  Chip,
  Button,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { api } from '../api';
import { Run } from '../types';

export const RunDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run | null>(null);
  const [graph, setGraph] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (runId: string) => {
    try {
      const [runData, graphData] = await Promise.all([
        api.runs.get(runId),
        api.runs.getGraph(runId)
      ]);
      setRun(runData);
      setGraph(graphData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (!run) return <Typography>Run not found</Typography>;

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/maestro/runs')} sx={{ mb: 2 }}>
        Back to Runs
      </Button>

      <Grid container spacing={3}>
        <Grid item xs={12}>
           <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5">Run: {run.id}</Typography>
                  <StatusChip status={run.status} />
              </Box>
              <Grid container spacing={2}>
                  <Grid item xs={3}><Typography color="textSecondary">Pipeline</Typography><Typography>{run.pipeline}</Typography></Grid>
                  <Grid item xs={3}><Typography color="textSecondary">Started</Typography><Typography>{new Date(run.started_at).toLocaleString()}</Typography></Grid>
                  <Grid item xs={3}><Typography color="textSecondary">Duration</Typography><Typography>{run.duration_ms}ms</Typography></Grid>
                  <Grid item xs={3}><Typography color="textSecondary">Cost</Typography><Typography>${run.cost?.toFixed(4)}</Typography></Grid>
              </Grid>
           </Paper>
        </Grid>

        <Grid item xs={12}>
            <Paper sx={{ p: 3, minHeight: 400 }}>
                <Typography variant="h6" gutterBottom>Task Graph</Typography>
                {graph ? (
                    <SimpleDAG graph={graph} />
                ) : (
                    <Typography>No graph data available</Typography>
                )}
            </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const StatusChip = ({ status }: { status: string }) => {
  let color: any = 'default';
  if (status === 'succeeded') color = 'success';
  if (status === 'failed') color = 'error';
  if (status === 'running') color = 'primary';
  return <Chip label={status} color={color} />;
};

// A very simple SVG DAG renderer
const SimpleDAG = ({ graph }: { graph: { nodes: any[], edges: any[] } }) => {
    // Simple layout: position nodes in a row for now
    // In a real app, use Dagre or ReactFlow
    const nodes = graph.nodes.map((n, i) => ({
        ...n,
        x: 50 + i * 150,
        y: 100
    }));

    return (
        <svg width="100%" height="300" style={{ border: '1px solid #eee' }}>
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ccc" />
                </marker>
            </defs>
            {graph.edges.map((e, i) => {
                const source = nodes.find(n => n.id === e.source);
                const target = nodes.find(n => n.id === e.target);
                if (!source || !target) return null;
                return (
                    <line
                        key={i}
                        x1={source.x} y1={source.y}
                        x2={target.x} y2={target.y}
                        stroke="#ccc"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                    />
                );
            })}
            {nodes.map(n => (
                <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                    <circle r="30" fill={n.status === 'success' ? '#e8f5e9' : n.status === 'running' ? '#e3f2fd' : '#f5f5f5'} stroke={n.status === 'success' ? 'green' : 'blue'} />
                    <text textAnchor="middle" dy="5" fontSize="12">{n.label}</text>
                </g>
            ))}
        </svg>
    );
};
