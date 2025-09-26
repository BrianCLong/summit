import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const FORECAST_QUERY = gql`
  query DashboardNodeAttributeForecast($nodeId: ID!, $attribute: String!, $horizon: Int) {
    mlNodeAttributeForecast(nodeId: $nodeId, attribute: $attribute, horizon: $horizon) {
      nodeId
      attribute
      horizon
      model
      lastUpdated
      metrics {
        rmse
        mae
        r2
      }
      history {
        timestamp
        value
      }
      predictions {
        timestamp
        value
      }
      tunedParameters {
        name
        value
      }
    }
  }
`;

type ForecastPoint = {
  timestamp: string;
  value: number;
};

type ForecastMetrics = {
  rmse?: number | null;
  mae?: number | null;
  r2?: number | null;
};

type ForecastResponse = {
  nodeId: string;
  attribute: string;
  horizon: number;
  model: string;
  lastUpdated?: string | null;
  metrics?: ForecastMetrics;
  history: ForecastPoint[];
  predictions: ForecastPoint[];
  tunedParameters?: { name: string; value: number }[];
};

const buildPath = (points: { x: number; y: number }[]): string => {
  if (!points.length) {
    return '';
  }
  return points
    .map((coordinate, index) => `${index === 0 ? 'M' : 'L'} ${coordinate.x} ${coordinate.y}`)
    .join(' ');
};

const NodeForecastWidget: React.FC = () => {
  const [nodeId, setNodeId] = useState('entity-001');
  const [attribute, setAttribute] = useState('activity_score');
  const [horizon, setHorizon] = useState(6);

  const [fetchForecast, { data, loading, error }] = useLazyQuery(FORECAST_QUERY, {
    fetchPolicy: 'network-only',
  });

  const loadForecast = useCallback(() => {
    if (!nodeId || !attribute) {
      return;
    }
    fetchForecast({ variables: { nodeId, attribute, horizon } });
  }, [fetchForecast, nodeId, attribute, horizon]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const forecast: ForecastResponse | undefined = data?.mlNodeAttributeForecast;
  const history = forecast?.history ?? [];
  const predictions = forecast?.predictions ?? [];
  const metrics = forecast?.metrics ?? {};
  const parameters = forecast?.tunedParameters ?? [];

  const chart = useMemo(() => {
    const totalPoints = history.length + predictions.length;
    if (totalPoints === 0) {
      return { historyPath: '', forecastPath: '', min: 0, max: 0 };
    }

    const width = 320;
    const height = 120;
    const allValues = [...history, ...predictions].map((point) => point.value);
    const minValue = Number.isFinite(Math.min(...allValues)) ? Math.min(...allValues) : 0;
    const maxValue = Number.isFinite(Math.max(...allValues)) ? Math.max(...allValues) : 1;
    const range = maxValue - minValue === 0 ? 1 : maxValue - minValue;
    const step = totalPoints > 1 ? width / (totalPoints - 1) : width;

    const scaleY = (value: number) => {
      if (!Number.isFinite(value)) {
        return height / 2;
      }
      return height - ((value - minValue) / range) * height;
    };

    const historyCoords = history.map((point, index) => ({
      x: index * step,
      y: scaleY(point.value),
    }));
    const forecastCoords = predictions.map((point, index) => ({
      x: (history.length + index) * step,
      y: scaleY(point.value),
    }));

    const historyPath = buildPath(historyCoords);
    const forecastPath = buildPath(
      historyCoords.length ? [historyCoords[historyCoords.length - 1], ...forecastCoords] : forecastCoords,
    );

    return { historyPath, forecastPath, min: minValue, max: maxValue };
  }, [history, predictions]);

  const formattedPredictions = predictions.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleString(),
    value: point.value,
  }));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Predictive Attribute Forecast
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Forecast node attribute trends using Optuna-tuned scikit-learn models backed by Neo4j history.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Node ID"
            value={nodeId}
            onChange={(event) => setNodeId(event.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Attribute"
            value={attribute}
            onChange={(event) => setAttribute(event.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Horizon"
            type="number"
            value={horizon}
            inputProps={{ min: 1, max: 96 }}
            onChange={(event) => setHorizon(Math.max(1, Number(event.target.value)))}
            size="small"
            sx={{ width: { xs: '100%', sm: 120 } }}
          />
        </Stack>

        <Button variant="contained" onClick={loadForecast} disabled={loading || !nodeId || !attribute} sx={{ mb: 2 }}>
          Refresh Forecast
        </Button>

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading predictive analytics…</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Unable to load forecast: {error.message}
          </Alert>
        )}

        {!loading && !error && forecast && (
          <>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Model: {forecast.model}{' '}
              {forecast.lastUpdated && `• Last updated ${new Date(forecast.lastUpdated).toLocaleString()}`}
            </Typography>

            <Box sx={{ mb: 2 }}>
              <svg width="100%" height="140" viewBox="0 0 320 140" preserveAspectRatio="none">
                <rect x={0} y={0} width={320} height={140} fill="var(--mui-palette-background-default, #fafafa)" />
                {chart.historyPath && (
                  <path d={chart.historyPath} stroke="#1976d2" strokeWidth={2} fill="none" />
                )}
                {chart.forecastPath && (
                  <path d={chart.forecastPath} strokeDasharray="6 4" stroke="#2e7d32" strokeWidth={2} fill="none" />
                )}
              </svg>
              <Typography variant="caption" color="text.secondary">
                Historical values shown in blue, forecast horizon in dashed green.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
              {Number.isFinite(metrics.rmse) && <Chip label={`RMSE ${metrics.rmse?.toFixed(2)}`} color="primary" />}
              {Number.isFinite(metrics.mae) && <Chip label={`MAE ${metrics.mae?.toFixed(2)}`} color="secondary" />}
              {Number.isFinite(metrics.r2) && <Chip label={`R² ${(metrics.r2 ?? 0).toFixed(2)}`} color="success" />}
            </Stack>

            {parameters.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
                {parameters.map((parameter) => (
                  <Chip
                    key={parameter.name}
                    label={`${parameter.name}: ${parameter.value.toFixed(2)}`}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Stack>
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Upcoming predictions
              </Typography>
              {formattedPredictions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No forecast values returned for the selected horizon.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {formattedPredictions.map((point) => (
                    <Box
                      key={`${point.timestamp}-${point.value}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {point.timestamp}
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {point.value.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </>
        )}

        {!loading && !error && !forecast && (
          <Typography variant="body2" color="text.secondary">
            Provide a node identifier and attribute to generate a forecast.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default NodeForecastWidget;
