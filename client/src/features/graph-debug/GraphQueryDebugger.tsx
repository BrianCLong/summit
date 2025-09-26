import React, { useMemo, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const GRAPH_QUERY_DEBUG = gql`
  query GraphQueryDebug($input: GraphQueryDebugInput!) {
    graphQueryDebug(input: $input) {
      cypher
      parameters
      plan
      planSummary
      suggestions {
        title
        detail
        level
        applied
      }
      errors {
        stage
        message
        hint
      }
      metrics {
        estimatedCost
        complexity
        nodeCount
        relationshipCount
        requiredIndexes
      }
    }
  }
`;

const DEFAULT_QUERY = `query GraphDataPreview($investigationId: ID!) {
  graphData(investigationId: $investigationId) {
    nodeCount
    edgeCount
  }
}`;

const DEFAULT_VARIABLES = `{
  "investigationId": "demo-investigation"
}`;

type PlanNode = {
  operatorType: string;
  identifiers?: string[];
  arguments?: Record<string, unknown>;
  children?: PlanNode[];
};

type DebugResult = {
  cypher?: string | null;
  parameters?: Record<string, unknown> | null;
  plan?: PlanNode | null;
  planSummary?: string | null;
  suggestions: Array<{ title: string; detail: string; level: string; applied?: boolean | null }>;
  errors: Array<{ stage: string; message: string; hint?: string | null }>;
  metrics?: {
    estimatedCost?: number | null;
    complexity?: number | null;
    nodeCount?: number | null;
    relationshipCount?: number | null;
    requiredIndexes?: string[] | null;
  } | null;
};

const suggestionColor: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
  info: 'info',
  default: 'success',
};

function PlanBranch({ node, depth = 0 }: { node: PlanNode; depth?: number }) {
  if (!node) {
    return null;
  }

  const children = Array.isArray(node.children) ? node.children : [];
  return (
    <Box pl={depth ? 2 : 0} borderLeft={depth ? '1px solid rgba(0,0,0,0.08)' : 'none'} mt={depth ? 1 : 0}>
      <Typography variant="body2" fontWeight={600} gutterBottom>
        {node.operatorType}
      </Typography>
      {node.identifiers && node.identifiers.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block">
          Identifiers: {node.identifiers.join(', ')}
        </Typography>
      )}
      {node.arguments && Object.keys(node.arguments).length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ wordBreak: 'break-word' }}>
          Args: {JSON.stringify(node.arguments)}
        </Typography>
      )}
      {children.map((child, index) => (
        <PlanBranch node={child} depth={depth + 1} key={`${node.operatorType}-${depth}-${index}`} />
      ))}
    </Box>
  );
}

function RequiredIndexes({ indexes }: { indexes?: string[] | null }) {
  if (!indexes || indexes.length === 0) {
    return null;
  }
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
      {indexes.map((idx) => (
        <Chip key={idx} label={idx} variant="outlined" size="small" />
      ))}
    </Stack>
  );
}

const GraphQueryDebugger: React.FC = () => {
  const [queryText, setQueryText] = useState<string>(DEFAULT_QUERY);
  const [variablesText, setVariablesText] = useState<string>(DEFAULT_VARIABLES);
  const [tenantId, setTenantId] = useState<string>('demo-tenant');
  const [parseError, setParseError] = useState<string | null>(null);

  const [runDebug, { data, loading, error }] = useLazyQuery<{ graphQueryDebug: DebugResult }>(GRAPH_QUERY_DEBUG, {
    fetchPolicy: 'no-cache',
  });

  const result = data?.graphQueryDebug;

  const stageError = useMemo(() => {
    if (!result?.errors) return null;
    return result.errors.reduce<Record<string, DebugResult['errors'][number]>>((acc, next) => {
      acc[next.stage] = next;
      return acc;
    }, {} as Record<string, DebugResult['errors'][number]>);
  }, [result?.errors]);

  const handleRun = () => {
    let parsedVariables: Record<string, unknown> | undefined = undefined;
    if (variablesText.trim().length > 0) {
      try {
        parsedVariables = JSON.parse(variablesText);
        setParseError(null);
      } catch (err) {
        setParseError((err as Error).message);
        return;
      }
    } else {
      setParseError(null);
    }

    runDebug({
      variables: {
        input: {
          graphql: queryText,
          variables: parsedVariables,
          tenantId: tenantId || undefined,
        },
      },
    }).catch((err) => {
      console.error('Graph query debug failed', err);
    });
  };

  const hasParseError = Boolean(parseError || stageError?.GRAPHQL_PARSE);

  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 12px 32px rgba(15, 46, 83, 0.08)' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box>
            <Typography variant="h6">Graph Query Debugger</Typography>
            <Typography variant="body2" color="text.secondary">
              Inspect the generated Cypher, execution plan, and optimization hints for your GraphQL queries.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRun}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Running…' : 'Run Debugger'}
          </Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <TextField
              label="GraphQL Query"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              fullWidth
              multiline
              minRows={12}
              error={hasParseError}
              helperText={
                parseError ?? stageError?.GRAPHQL_PARSE?.message ?? 'Provide a query to translate into Cypher.'
              }
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <TextField
                label="Variables (JSON)"
                value={variablesText}
                onChange={(event) => setVariablesText(event.target.value)}
                fullWidth
                multiline
                minRows={6}
                error={Boolean(parseError)}
                helperText={parseError ? `Invalid JSON: ${parseError}` : 'Optional GraphQL variables.'}
              />
              <TextField
                label="Tenant ID (optional)"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                fullWidth
                helperText="Used for optimizer context; leave blank to infer from session."
              />
            </Stack>
          </Grid>
        </Grid>

        {(error || result?.errors?.length) && (
          <Stack spacing={1} mt={3}>
            {error && <Alert severity="error">{error.message}</Alert>}
            {result?.errors?.map((item, index) => (
              <Alert
                key={`${item.stage}-${index}`}
                severity={item.stage === 'PLAN' || item.stage === 'TRANSLATION' ? 'error' : 'warning'}
              >
                <Typography variant="body2" fontWeight={600} component="span">
                  {item.stage}:
                </Typography>{' '}
                {item.message}
                {item.hint ? (
                  <Typography variant="caption" display="block">
                    Hint: {item.hint}
                  </Typography>
                ) : null}
              </Alert>
            ))}
          </Stack>
        )}

        {result?.cypher && (
          <Box mt={4}>
            <Typography variant="subtitle1" gutterBottom>
              Generated Cypher
            </Typography>
            <Box
              component="pre"
              sx={{
                backgroundColor: '#0f1b2a',
                color: '#e6f1ff',
                borderRadius: 2,
                p: 2,
                overflowX: 'auto',
                fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 13,
              }}
            >
              {result.cypher}
            </Box>
          </Box>
        )}

        {result?.parameters && (
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>
              Parameters
            </Typography>
            <Box
              component="pre"
              sx={{
                backgroundColor: 'rgba(15, 46, 83, 0.06)',
                borderRadius: 2,
                p: 2,
                overflowX: 'auto',
                fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 13,
              }}
            >
              {JSON.stringify(result.parameters, null, 2)}
            </Box>
          </Box>
        )}

        {result?.metrics && (
          <Box mt={4}>
            <Typography variant="subtitle1" gutterBottom>
              Metrics
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {typeof result.metrics.estimatedCost === 'number' && (
                <Chip label={`Estimated Cost: ${result.metrics.estimatedCost.toFixed(2)}`} color="secondary" />
              )}
              {typeof result.metrics.complexity === 'number' && (
                <Chip label={`Complexity Score: ${result.metrics.complexity}`} variant="outlined" />
              )}
              {typeof result.metrics.nodeCount === 'number' && (
                <Chip label={`Nodes: ${result.metrics.nodeCount}`} variant="outlined" />
              )}
              {typeof result.metrics.relationshipCount === 'number' && (
                <Chip label={`Relationships: ${result.metrics.relationshipCount}`} variant="outlined" />
              )}
            </Stack>
            <RequiredIndexes indexes={result.metrics.requiredIndexes ?? undefined} />
          </Box>
        )}

        {result?.suggestions?.length ? (
          <Box mt={4}>
            <Typography variant="subtitle1" gutterBottom>
              Optimization Suggestions
            </Typography>
            <Stack spacing={1}>
              {result.suggestions.map((suggestion, index) => {
                const severity = suggestionColor[suggestion.level] ?? suggestionColor.default;
                return (
                  <Alert key={`${suggestion.title}-${index}`} severity={severity} variant="outlined">
                    <Typography variant="body2" fontWeight={600} component="span">
                      {suggestion.title}
                    </Typography>
                    {suggestion.applied === true && (
                      <Chip label="applied" size="small" color="success" sx={{ ml: 1 }} />
                    )}
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {suggestion.detail}
                    </Typography>
                  </Alert>
                );
              })}
            </Stack>
          </Box>
        ) : null}

        {result?.plan && (
          <Box mt={4}>
            <Typography variant="subtitle1" gutterBottom>
              Execution Plan
            </Typography>
            {result.planSummary && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {result.planSummary}
              </Typography>
            )}
            <Divider sx={{ mb: 2 }} />
            <PlanBranch node={result.plan} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default GraphQueryDebugger;
