import React, { useEffect, useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const VERSIONS_QUERY = gql`
  query ConsentPolicyVersions {
    consentPolicyVersions {
      id
      label
      validTime
      txTime
      summary
    }
  }
`;

const SNAPSHOT_QUERY = gql`
  query ConsentGraphSnapshot($validTime: DateTime!, $txTime: DateTime!) {
    consentGraphAsOf(validTime: $validTime, txTime: $txTime) {
      asOfValid
      asOfTx
      nodes {
        id
        type
        name
        metadata
      }
      edges {
        id
        type
        fromId
        toId
        metadata
        validInterval {
          start
          end
        }
        txInterval {
          start
          end
        }
      }
    }
  }
`;

const DIFF_QUERY = gql`
  query ConsentPolicyDiff($baseVersionId: ID!, $compareVersionId: ID!) {
    consentPolicyDiff(baseVersionId: $baseVersionId, compareVersionId: $compareVersionId) {
      baseVersionId
      compareVersionId
      added {
        id
        type
        fromId
        toId
        metadata
      }
      removed {
        id
        type
        fromId
        toId
        metadata
      }
      unchangedCount
    }
  }
`;

const IMPACT_QUERY = gql`
  query ConsentRevocationImpact($purposeId: ID!, $validTime: DateTime!, $txTime: DateTime!) {
    consentRevocationImpact(purposeId: $purposeId, validTime: $validTime, txTime: $txTime) {
      purpose {
        id
        name
        type
      }
      totalImpactedFlows
      impactedSubjects {
        subject {
          id
          name
        }
        flows {
          flow {
            id
            description
            scopeId
            purposeId
          }
          scope {
            id
            name
          }
          delegations {
            id
            name
          }
        }
      }
    }
  }
`;

type Version = {
  id: string;
  label: string;
  validTime: string;
  txTime: string;
  summary?: string | null;
};

type SnapshotNode = {
  id: string;
  type: string;
  name: string;
  metadata?: Record<string, unknown> | null;
};

type SnapshotEdge = {
  id: string;
  type: string;
  fromId: string;
  toId: string;
  metadata?: {
    flow?: {
      id: string;
      subjectId: string;
      purposeId: string;
      scopeId: string;
      description: string;
      delegationChain: string[];
    };
  } | null;
};

type SnapshotData = {
  consentGraphAsOf?: {
    asOfValid: string;
    asOfTx: string;
    nodes: SnapshotNode[];
    edges: SnapshotEdge[];
  };
};

type DiffEdge = {
  id: string;
  type: string;
  fromId: string;
  toId: string;
  metadata?: SnapshotEdge['metadata'];
};

type DiffData = {
  consentPolicyDiff?: {
    added: DiffEdge[];
    removed: DiffEdge[];
    unchangedCount: number;
  };
};

type ImpactData = {
  consentRevocationImpact?: {
    purpose: { id: string; name: string };
    totalImpactedFlows: number;
    impactedSubjects: {
      subject: { id: string; name: string };
      flows: {
        flow: { id: string; description: string; scopeId: string; purposeId: string };
        scope: { id: string; name: string };
        delegations: { id: string; name: string }[];
      }[];
    }[];
  };
};

function friendlyId(id: string) {
  const [, rest] = id.split(':');
  if (!rest) return id;
  return rest
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function EdgeSummary({ edge }: { edge: DiffEdge }) {
  const flow = edge.metadata?.flow;
  if (flow) {
    return (
      <Typography variant="body2">
        {flow.description}
        <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {`Subject: ${friendlyId(flow.subjectId)} • Purpose: ${friendlyId(flow.purposeId)} • Scope: ${friendlyId(flow.scopeId)}`}
        </Typography>
      </Typography>
    );
  }

  return (
    <Typography variant="body2">
      {`${friendlyId(edge.fromId)} → ${friendlyId(edge.toId)}`}
      <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
        {edge.type.replace(/_/g, ' ')}
      </Typography>
    </Typography>
  );
}

function ConsentGraphExplorer() {
  const { data: versionsData, loading: versionsLoading, error: versionsError } = useQuery<{ consentPolicyVersions: Version[] }>(
    VERSIONS_QUERY,
  );

  const versions = versionsData?.consentPolicyVersions ?? [];

  const [snapshotVersionId, setSnapshotVersionId] = useState<string | null>(null);
  const [diffBaseId, setDiffBaseId] = useState<string | null>(null);
  const [diffCompareId, setDiffCompareId] = useState<string | null>(null);
  const [selectedPurposeId, setSelectedPurposeId] = useState<string | null>(null);

  useEffect(() => {
    if (!versionsLoading && versions.length > 0) {
      if (!snapshotVersionId) {
        setSnapshotVersionId(versions[versions.length - 1]?.id ?? null);
      }
      if (!diffBaseId) {
        setDiffBaseId(versions[0]?.id ?? null);
      }
      if (!diffCompareId && versions.length > 1) {
        setDiffCompareId(versions[versions.length - 1]?.id ?? null);
      }
    }
  }, [versionsLoading, versions, snapshotVersionId, diffBaseId, diffCompareId]);

  const snapshotVersion = useMemo(
    () => versions.find((item) => item.id === snapshotVersionId) ?? null,
    [versions, snapshotVersionId],
  );

  const { data: snapshotData, loading: snapshotLoading, error: snapshotError } = useQuery<SnapshotData>(
    SNAPSHOT_QUERY,
    {
      skip: !snapshotVersion,
      variables: snapshotVersion
        ? { validTime: snapshotVersion.validTime, txTime: snapshotVersion.txTime }
        : undefined,
    },
  );

  const snapshot = snapshotData?.consentGraphAsOf;

  const purposeNodes = useMemo(
    () => snapshot?.nodes.filter((node) => node.type === 'PURPOSE') ?? [],
    [snapshot?.nodes],
  );

  useEffect(() => {
    if (!purposeNodes.length) {
      setSelectedPurposeId(null);
      return;
    }
    if (!selectedPurposeId || !purposeNodes.some((node) => node.id === selectedPurposeId)) {
      setSelectedPurposeId(purposeNodes[0]?.id ?? null);
    }
  }, [purposeNodes, selectedPurposeId]);

  const nodeLookup = useMemo(() => {
    const map = new Map<string, SnapshotNode>();
    snapshot?.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [snapshot?.nodes]);

  const flows = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    return snapshot.edges
      .filter((edge) => edge.type === 'SUBJECT_SCOPE_FLOW' && edge.metadata?.flow)
      .map((edge) => {
        const flow = edge.metadata?.flow!;
        const subjectName = nodeLookup.get(flow.subjectId)?.name ?? friendlyId(flow.subjectId);
        const scopeName = nodeLookup.get(flow.scopeId)?.name ?? friendlyId(flow.scopeId);
        const purposeName = nodeLookup.get(flow.purposeId)?.name ?? friendlyId(flow.purposeId);
        const delegations = flow.delegationChain.map(
          (delegationId) => nodeLookup.get(delegationId)?.name ?? friendlyId(delegationId),
        );
        return {
          id: flow.id,
          description: flow.description,
          subjectName,
          purposeName,
          scopeName,
          delegations,
        };
      });
  }, [snapshot, nodeLookup]);

  const nodeCounts = useMemo(() => {
    return snapshot?.nodes.reduce(
      (acc, node) => {
        acc[node.type] = (acc[node.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [snapshot?.nodes]);

  const { data: diffData, loading: diffLoading, error: diffError } = useQuery<DiffData>(DIFF_QUERY, {
    skip: !diffBaseId || !diffCompareId || diffBaseId === diffCompareId,
    variables: diffBaseId && diffCompareId ? { baseVersionId: diffBaseId, compareVersionId: diffCompareId } : undefined,
  });

  const { data: impactData, loading: impactLoading, error: impactError } = useQuery<ImpactData>(IMPACT_QUERY, {
    skip: !selectedPurposeId || !snapshotVersion,
    variables:
      selectedPurposeId && snapshotVersion
        ? {
            purposeId: selectedPurposeId,
            validTime: snapshotVersion.validTime,
            txTime: snapshotVersion.txTime,
          }
        : undefined,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 600 }}>
        Consent Graph Explorer
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Inspect the versioned consent graph, compare policy revisions, and understand the downstream impact of purpose
        changes.
      </Typography>

      {versionsError && <Alert severity="error">Unable to load consent policy versions.</Alert>}

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Versioned snapshot
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a policy version to view its bitemporal state as of recorded valid and transaction times.
              </Typography>
            </Box>
            {snapshotLoading && <LinearProgress sx={{ width: 160 }} />}
          </Stack>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="snapshot-version-label">Policy version</InputLabel>
                <Select
                  labelId="snapshot-version-label"
                  label="Policy version"
                  value={snapshotVersionId ?? ''}
                  onChange={(event) => setSnapshotVersionId(event.target.value || null)}
                >
                  {versions.map((version) => (
                    <MenuItem key={version.id} value={version.id}>
                      {version.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {snapshotVersion && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {`Valid as of ${new Date(snapshotVersion.validTime).toLocaleString()} • Tx as of ${new Date(
                    snapshotVersion.txTime,
                  ).toLocaleString()}`}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {(nodeCounts ? Object.entries(nodeCounts) : []).map(([type, count]) => (
                  <Chip key={type} label={`${friendlyId(type)}: ${count}`} color="primary" variant="outlined" />
                ))}
                <Chip label={`Edges: ${snapshot?.edges.length ?? 0}`} color="secondary" variant="outlined" />
                <Chip label={`Flows: ${flows.length}`} color="success" variant="outlined" />
              </Stack>
            </Grid>
          </Grid>

          {snapshotError && <Alert severity="error">Failed to load consent snapshot.</Alert>}

          {!snapshotLoading && snapshot && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Active flows
              </Typography>
              {flows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No active data flows were found for this snapshot.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Flow</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Purpose</TableCell>
                      <TableCell>Scope</TableCell>
                      <TableCell>Delegations</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {flows.map((flow) => (
                      <TableRow key={flow.id} hover>
                        <TableCell>{flow.description}</TableCell>
                        <TableCell>{flow.subjectName}</TableCell>
                        <TableCell>{flow.purposeName}</TableCell>
                        <TableCell>{flow.scopeName}</TableCell>
                        <TableCell>
                          {flow.delegations.length > 0 ? flow.delegations.join(', ') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Diff between policy versions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compare two policy checkpoints to isolate the true consent graph deltas.
              </Typography>
            </Box>
            {diffLoading && <LinearProgress sx={{ width: 160 }} />}
          </Stack>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="diff-base-label">Base version</InputLabel>
                <Select
                  labelId="diff-base-label"
                  label="Base version"
                  value={diffBaseId ?? ''}
                  onChange={(event) => setDiffBaseId(event.target.value || null)}
                >
                  {versions.map((version) => (
                    <MenuItem key={version.id} value={version.id}>
                      {version.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="diff-compare-label">Compare to</InputLabel>
                <Select
                  labelId="diff-compare-label"
                  label="Compare to"
                  value={diffCompareId ?? ''}
                  onChange={(event) => setDiffCompareId(event.target.value || null)}
                >
                  {versions.map((version) => (
                    <MenuItem key={version.id} value={version.id}>
                      {version.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {diffError && <Alert severity="error">Failed to compute diff between versions.</Alert>}

          {diffBaseId === diffCompareId && diffBaseId && (
            <Alert severity="info">Select two different versions to see the consent delta.</Alert>
          )}

          {!diffLoading && diffData?.consentPolicyDiff && diffBaseId !== diffCompareId && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Added ({diffData.consentPolicyDiff.added.length})
                </Typography>
                {diffData.consentPolicyDiff.added.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No new consent relationships were introduced.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {diffData.consentPolicyDiff.added.map((edge) => (
                      <Card key={edge.id} variant="outlined">
                        <CardContent>
                          <Typography variant="overline" color="success.main">
                            Added
                          </Typography>
                          <EdgeSummary edge={edge} />
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Removed ({diffData.consentPolicyDiff.removed.length})
                </Typography>
                {diffData.consentPolicyDiff.removed.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No consent relationships were retired.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {diffData.consentPolicyDiff.removed.map((edge) => (
                      <Card key={edge.id} variant="outlined">
                        <CardContent>
                          <Typography variant="overline" color="error.main">
                            Removed
                          </Typography>
                          <EdgeSummary edge={edge} />
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Impact analyzer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Understand which subjects, scopes, and delegations are disrupted if a purpose is revoked.
              </Typography>
            </Box>
            {impactLoading && <LinearProgress sx={{ width: 160 }} />}
          </Stack>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="purpose-select-label">Purpose</InputLabel>
                <Select
                  labelId="purpose-select-label"
                  label="Purpose"
                  value={selectedPurposeId ?? ''}
                  onChange={(event) => setSelectedPurposeId(event.target.value || null)}
                  disabled={!purposeNodes.length}
                >
                  {purposeNodes.map((purpose) => (
                    <MenuItem key={purpose.id} value={purpose.id}>
                      {purpose.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {impactError && <Alert severity="error">Failed to calculate revocation impact.</Alert>}

          {!impactLoading && impactData?.consentRevocationImpact && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {`Impacted flows: ${impactData.consentRevocationImpact.totalImpactedFlows}`}
              </Typography>
              <Divider sx={{ my: 1 }} />
              {impactData.consentRevocationImpact.impactedSubjects.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Revoking this purpose would not change any active data flows for the selected snapshot.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {impactData.consentRevocationImpact.impactedSubjects.map((subject) => (
                    <Card key={subject.subject.id} variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {subject.subject.name}
                        </Typography>
                        <Stack spacing={1} sx={{ mt: 1 }}>
                          {subject.flows.map((flow) => (
                            <Box key={flow.flow.id}>
                              <Typography variant="body2">{flow.flow.description}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {`Scope: ${flow.scope.name}`}
                                {flow.delegations.length > 0
                                  ? ` • Delegations: ${flow.delegations.map((delegation) => delegation.name).join(', ')}`
                                  : ''}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default ConsentGraphExplorer;
