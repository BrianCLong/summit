import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { gql, useQuery } from '@apollo/client';
import { Experiment, Variant, emitter } from 'react-ab-test';
import { trace } from '@opentelemetry/api';
import StatsOverview from './StatsOverview';
import LatencyPanels from './LatencyPanels';
import ErrorPanels from './ErrorPanels';
import ResolverTop5 from './ResolverTop5';
import GrafanaLinkCard from './GrafanaLinkCard';
import LiveActivityFeed from './LiveActivityFeed';

const UI_EXPERIMENTS_QUERY = gql`
  query UIExperiments($featureKeys: [String!]) {
    uiExperiments(featureKeys: $featureKeys) {
      id
      tenantId
      featureKey
      description
      isActive
      updatedAt
      variations {
        name
        weight
        config
      }
    }
  }
`;

const DASHBOARD_FEATURE_KEY = 'dashboard-layout';
const DEFAULT_VARIATIONS = [
  { name: 'control', weight: 1, config: { layout: 'legacy' } },
  { name: 'compact', weight: 1, config: { layout: 'compact' } },
];

const tracer = trace.getTracer('maestro-ui-experiments', '1.0.0');

type VariationConfig = {
  name: string;
  weight: number;
  config: Record<string, unknown>;
};

type ExperimentRecord = {
  id?: string;
  featureKey: string;
  isActive?: boolean;
  updatedAt?: string;
  variations: VariationConfig[];
};

type LayoutTelemetry = {
  trackInteraction: (interaction: string, attributes?: Record<string, unknown>) => void;
};

const ControlLayout: React.FC<LayoutTelemetry> = ({ trackInteraction }) => (
  <Box p={2} aria-live="polite">
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            Stats Overview
          </Typography>
          <StatsOverview />
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <LiveActivityFeed />
      </Grid>
      <Grid item xs={12} md={4}>
        <GrafanaLinkCard
          onGrafanaClick={() => trackInteraction('open_grafana', { target: 'grafana' })}
          onJaegerClick={() => trackInteraction('open_jaeger', { target: 'jaeger' })}
        />
      </Grid>
      <Grid item xs={12}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <LatencyPanels />
        </Paper>
      </Grid>
      <Grid item xs={12}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <ErrorPanels />
        </Paper>
      </Grid>
      <Grid item xs={12}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <ResolverTop5 />
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

const CompactLayout: React.FC<LayoutTelemetry> = ({ trackInteraction }) => (
  <Box p={2} aria-live="polite">
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            System Health Summary
          </Typography>
          <StatsOverview />
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            Live Activity Feed
          </Typography>
          <LiveActivityFeed />
        </Paper>
      </Grid>
      <Grid item xs={12} md={4} display="flex" flexDirection="column" gap={2}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Investigator Top Signals
          </Typography>
          <ResolverTop5 />
        </Paper>
        <GrafanaLinkCard
          onGrafanaClick={() => trackInteraction('open_grafana', { target: 'grafana', layout: 'compact' })}
          onJaegerClick={() => trackInteraction('open_jaeger', { target: 'jaeger', layout: 'compact' })}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            Latency Trends
          </Typography>
          <LatencyPanels />
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            Error Hotspots
          </Typography>
          <ErrorPanels />
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

function getUserIdentifier(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const storageKey = 'ui-experiments:user-id';
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) {
      return existing;
    }
    const identifier = window.crypto?.randomUUID?.() || `anon-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, identifier);
    return identifier;
  } catch (error) {
    console.warn('Unable to access localStorage for experiment user identifier', error);
    return undefined;
  }
}

function sanitizeVariations(variations: VariationConfig[]): VariationConfig[] {
  if (!Array.isArray(variations) || variations.length === 0) {
    return DEFAULT_VARIATIONS;
  }
  return variations.map((variation) => ({
    name: typeof variation.name === 'string' ? variation.name : 'control',
    weight: typeof variation.weight === 'number' && variation.weight > 0 ? variation.weight : 1,
    config: typeof variation.config === 'object' && variation.config !== null ? variation.config : {},
  }));
}

function selectVariant(
  experiment: ExperimentRecord,
  fallbackVariant: VariationConfig,
  requestedVariant?: string,
): VariationConfig {
  if (requestedVariant) {
    const match = experiment.variations.find((variant) => variant.name === requestedVariant);
    if (match) {
      return match;
    }
  }
  return (
    experiment.variations.find((variant) => variant.name === fallbackVariant.name) ||
    experiment.variations[0] ||
    fallbackVariant
  );
}

function useExperimentTelemetry(
  experiment: ExperimentRecord,
  activeVariant: VariationConfig | null,
  ready: boolean,
): LayoutTelemetry {
  useEffect(() => {
    if (!ready || !experiment?.featureKey || !activeVariant?.name) {
      return;
    }
    const span = tracer.startSpan('ui.experiment.exposure', {
      attributes: {
        'ui.experiment.feature': experiment.featureKey,
        'ui.experiment.variant': activeVariant.name,
        'ui.experiment.id': experiment.id ?? 'unknown',
        'ui.experiment.is_active': experiment.isActive ?? false,
        'ui.experiment.updated_at': experiment.updatedAt ?? 'unknown',
      },
    });
    span.end();
    if (ready && typeof window !== 'undefined' && activeVariant?.name) {
      const events = (window as any).__otelExperimentEvents || [];
      events.push({
        type: 'exposure',
        feature: experiment.featureKey,
        variant: activeVariant.name,
      });
      (window as any).__otelExperimentEvents = events;
    }
  }, [ready, experiment?.featureKey, experiment?.id, experiment?.isActive, experiment?.updatedAt, activeVariant?.name]);

  const trackInteraction = useCallback(
    (interaction: string, attributes: Record<string, unknown> = {}) => {
      if (!ready || !experiment?.featureKey || !activeVariant?.name) {
        return;
      }
      tracer.startActiveSpan(
        'ui.experiment.interaction',
        {
          attributes: {
            'ui.experiment.feature': experiment.featureKey,
            'ui.experiment.variant': activeVariant.name,
            'ui.experiment.id': experiment.id ?? 'unknown',
            'ui.interaction.name': interaction,
            ...attributes,
          },
        },
          (span) => {
            span.end();
          if (ready && typeof window !== 'undefined') {
            const events = (window as any).__otelExperimentEvents || [];
            events.push({
              type: 'interaction',
              feature: experiment.featureKey,
              variant: activeVariant.name,
              interaction,
              attributes,
            });
            (window as any).__otelExperimentEvents = events;
          }
        },
      );
    },
    [ready, experiment?.featureKey, experiment?.id, activeVariant?.name],
  );

  return { trackInteraction };
}

export default function DashboardLayoutExperiment() {
  const { data, loading, error } = useQuery(UI_EXPERIMENTS_QUERY, {
    variables: { featureKeys: [DASHBOARD_FEATURE_KEY] },
    fetchPolicy: 'cache-first',
  });

  const remoteExperiment = data?.uiExperiments?.[0];

  const experiment: ExperimentRecord = useMemo(() => {
    if (!remoteExperiment) {
      return { featureKey: DASHBOARD_FEATURE_KEY, variations: DEFAULT_VARIATIONS };
    }
    const sanitized = sanitizeVariations(remoteExperiment.variations);
    return {
      id: remoteExperiment.id,
      featureKey: remoteExperiment.featureKey || DASHBOARD_FEATURE_KEY,
      isActive: remoteExperiment.isActive,
      updatedAt: remoteExperiment.updatedAt,
      variations: sanitized,
    };
  }, [remoteExperiment]);

  useEffect(() => {
    if (!experiment?.featureKey || !experiment.variations.length) {
      return;
    }
    const variantNames = experiment.variations.map((variant) => variant.name);
    const weights = experiment.variations.map((variant) => (variant.weight > 0 ? variant.weight : 1));
    try {
      emitter.defineVariants(experiment.featureKey, variantNames, weights);
    } catch (defineError) {
      console.warn('Failed to define variants for experiment', experiment.featureKey, defineError);
    }
  }, [experiment?.featureKey, experiment?.variations]);

  const [activeVariantName, setActiveVariantName] = useState<string | null>(null);

  useEffect(() => {
    if (!experiment?.featureKey) {
      return undefined;
    }
    const existing = emitter.getActiveVariant(experiment.featureKey);
    if (typeof existing === 'string') {
      setActiveVariantName(existing);
    }
    const subscription = emitter.addPlayListener(experiment.featureKey, (_experimentName, variantName) => {
      setActiveVariantName(variantName);
    });
    return () => {
      subscription.remove();
    };
  }, [experiment?.featureKey]);

  const activeVariant = useMemo(() => {
    return selectVariant(experiment, DEFAULT_VARIATIONS[0], activeVariantName || undefined);
  }, [experiment, activeVariantName]);

  const variantReady = Boolean(activeVariantName);

  useEffect(() => {
    if (!variantReady || !experiment?.featureKey || !activeVariant?.name) {
      return;
    }
    emitter.setActiveVariant(experiment.featureKey, activeVariant.name);
  }, [variantReady, experiment?.featureKey, activeVariant?.name]);

  const telemetry = useExperimentTelemetry(experiment, activeVariant, variantReady);
  const userIdentifier = useMemo(() => getUserIdentifier(), []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__otelExperimentEvents = [];
    }
  }, []);

  if (loading && !remoteExperiment) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress size={32} aria-label="Loading dashboard experiment" />
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {error && (
        <Alert severity="warning" role="status">
          Unable to load experiment configuration. Falling back to default dashboard layout.
        </Alert>
      )}
      <Experiment
        name={experiment.featureKey}
        defaultVariantName={DEFAULT_VARIATIONS[0].name}
        userIdentifier={userIdentifier}
      >
        <Variant name="control">
          <ControlLayout trackInteraction={telemetry.trackInteraction} />
        </Variant>
        <Variant name="compact">
          <CompactLayout trackInteraction={telemetry.trackInteraction} />
        </Variant>
      </Experiment>
    </Box>
  );
}
