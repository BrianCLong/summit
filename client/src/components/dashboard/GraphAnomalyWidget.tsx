import React, { useMemo, useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';

const GRAPH_TRAVERSAL_ANOMALIES = gql`
  query GraphTraversalAnomalies(
    $entityId: ID!
    $investigationId: ID!
    $radius: Int
    $threshold: Float
    $contamination: Float
  ) {
    graphTraversalAnomalies(
      entityId: $entityId
      investigationId: $investigationId
      radius: $radius
      threshold: $threshold
      contamination: $contamination
    ) {
      summary {
        totalNodes
        totalEdges
        anomalyCount
        modelVersion
        threshold
        contamination
      }
      nodes {
        id
        score
        isAnomaly
        reason
        label
        type
        metrics
      }
      metadata
    }
  }
`;

interface GraphAnomalyWidgetProps {
  investigationId?: string;
  defaultEntityId?: string;
  radius?: number;
  threshold?: number;
  contamination?: number;
}

interface GraphAnomalySummary {
  totalNodes: number;
  totalEdges: number;
  anomalyCount: number;
  modelVersion: string;
  threshold: number;
  contamination: number;
}

interface GraphAnomalyNode {
  id: string;
  score: number;
  isAnomaly: boolean;
  reason: string;
  label?: string | null;
  type?: string | null;
  metrics: Record<string, number>;
}

export const GraphAnomalyWidget: React.FC<GraphAnomalyWidgetProps> = ({
  investigationId,
  defaultEntityId = '',
  radius = 1,
  threshold = 0.6,
  contamination = 0.15,
}) => {
  const [entityInput, setEntityInput] = useState(defaultEntityId);
  const [activeEntityId, setActiveEntityId] = useState(defaultEntityId);

  useEffect(() => {
    setEntityInput(defaultEntityId || '');
    setActiveEntityId(defaultEntityId || '');
  }, [defaultEntityId]);

  const shouldSkip = !investigationId || !activeEntityId;

  const { data, loading, error, refetch } = useQuery(GRAPH_TRAVERSAL_ANOMALIES, {
    variables: {
      entityId: activeEntityId,
      investigationId,
      radius,
      threshold,
      contamination,
    },
    skip: shouldSkip,
    fetchPolicy: 'network-only',
  });

  const summary: GraphAnomalySummary | undefined = data?.graphTraversalAnomalies?.summary;
  const anomalies: GraphAnomalyNode[] = useMemo(
    () => data?.graphTraversalAnomalies?.nodes ?? [],
    [data],
  );

  const handleAnalyze = () => {
    if (!entityInput.trim() || !investigationId) {
      return;
    }
    setActiveEntityId(entityInput.trim());
    if (!shouldSkip) {
      refetch({
        entityId: entityInput.trim(),
        investigationId,
        radius,
        threshold,
        contamination,
      });
    }
  };

  return (
    <Card elevation={2} sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} mb={2}>
          <Box>
            <Typography variant="h6" component="h3">
              Graph Traversal Anomalies
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Isolation Forest scoring on Neo4j traversal neighborhoods
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Root Entity ID"
              size="small"
              value={entityInput}
              onChange={(event) => setEntityInput(event.target.value)}
              placeholder="entity-123"
            />
            <Button
              variant="contained"
              onClick={handleAnalyze}
              startIcon={<RefreshIcon />}
              disabled={!investigationId}
            >
              Analyze
            </Button>
          </Stack>
        </Stack>

        {!investigationId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Select an investigation to run anomaly detection.
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <LinearProgress sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Scoring traversal...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load anomaly scores: {error.message}
          </Alert>
        )}

        {summary && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
            <Chip label={`Nodes: ${summary.totalNodes}`} color="primary" variant="outlined" />
            <Chip label={`Edges: ${summary.totalEdges}`} color="primary" variant="outlined" />
            <Chip label={`Anomalies: ${summary.anomalyCount}`} color={summary.anomalyCount ? 'error' : 'success'} variant="filled" />
            <Tooltip title={`Isolation Forest (${summary.modelVersion})`}>
              <Chip label={`Threshold: ${summary.threshold.toFixed(2)}`} variant="outlined" />
            </Tooltip>
            <Chip label={`Contamination: ${(summary.contamination * 100).toFixed(1)}%`} variant="outlined" />
          </Stack>
        )}

        {anomalies.length > 0 ? (
          <Stack spacing={1.5}>
            {anomalies.map((node) => (
              <Box
                key={node.id}
                sx={{
                  border: '1px solid',
                  borderColor: node.isAnomaly ? 'error.light' : 'grey.200',
                  borderRadius: 1.5,
                  p: 1.5,
                  backgroundColor: node.isAnomaly ? 'error.50' : 'background.paper',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {node.isAnomaly ? (
                        <WarningAmberIcon color="error" fontSize="small" />
                      ) : (
                        <CheckCircleIcon color="success" fontSize="small" />
                      )}
                      <Typography variant="subtitle1" fontWeight={600}>
                        {node.label || node.id}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {node.type || 'Entity'} · Score {node.score.toFixed(3)}
                    </Typography>
                  </Box>
                  <Chip
                    label={node.isAnomaly ? 'Anomalous' : 'Baseline'}
                    color={node.isAnomaly ? 'error' : 'default'}
                    size="small"
                  />
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.primary">
                  {node.reason}
                </Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                  {Object.entries(node.metrics).map(([metric, value]) => (
                    <Chip key={metric} label={`${metric}: ${value}`} size="small" />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          !loading && (
            <Typography variant="body2" color="text.secondary">
              {shouldSkip
                ? 'Provide an entity ID to run anomaly detection.'
                : 'No anomalies detected for this traversal.'}
            </Typography>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default GraphAnomalyWidget;
