import React, { useCallback, useMemo } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { format } from 'date-fns';

const COMPLIANCE_DASHBOARD_QUERY = gql`
  query ComplianceDashboard($tenantId: String!, $limit: Int) {
    complianceDashboard(tenantId: $tenantId, limit: $limit) {
      generatedAt
      auditLogs {
        id
        action
        resourceType
        resourceId
        userId
        userEmail
        userRole
        ipAddress
        userAgent
        details
        createdAt
      }
      securityScans {
        id
        scanType
        target
        status
        criticalCount
        highCount
        mediumCount
        lowCount
        totalFindings
        durationSeconds
        reportUrl
        metadata
        scannedAt
      }
      policyValidations {
        id
        policy
        decision
        allow
        reason
        metadata
        evaluatedAt
      }
      metrics {
        openFindings
        scanSuccessRate
        policyPassRate
        promMetrics {
          name
          value
          labels
        }
      }
    }
  }
`;

type ComplianceDashboardResult = {
  complianceDashboard: {
    generatedAt: string;
    auditLogs: Array<{
      id: string;
      action: string;
      resourceType: string;
      resourceId?: string | null;
      userId?: string | null;
      userEmail?: string | null;
      userRole?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
      details?: unknown;
      createdAt: string;
    }>;
    securityScans: Array<{
      id: string;
      scanType: string;
      target?: string | null;
      status: string;
      criticalCount: number;
      highCount: number;
      mediumCount: number;
      lowCount: number;
      totalFindings: number;
      durationSeconds?: number | null;
      reportUrl?: string | null;
      metadata?: unknown;
      scannedAt: string;
    }>;
    policyValidations: Array<{
      id: string;
      policy: string;
      decision: string;
      allow: boolean;
      reason?: string | null;
      metadata?: unknown;
      evaluatedAt: string;
    }>;
    metrics: {
      openFindings: number;
      scanSuccessRate: number;
      policyPassRate: number;
      promMetrics: Array<{
        name: string;
        value: number;
        labels?: Record<string, unknown> | null;
      }>;
    };
  };
};

type ComplianceDashboardVariables = {
  tenantId: string;
  limit?: number;
};

function previewJson(value: unknown): string {
  if (value == null) {
    return '—';
  }

  const stringified =
    typeof value === 'string'
      ? value
      : (() => {
          try {
            return JSON.stringify(value);
          } catch (error) {
            console.warn('Failed to stringify value for preview', error);
            return String(value);
          }
        })();

  if (stringified.length <= 80) {
    return stringified;
  }

  return `${stringified.slice(0, 77)}…`;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '—';
  }

  try {
    return format(new Date(value), 'PPpp');
  } catch (error) {
    console.warn('Failed to format date', { error, value });
    return value;
  }
}

const STATUS_COLOR: Record<string, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
  passed: 'success',
  success: 'success',
  completed: 'success',
  failed: 'error',
  error: 'error',
  warning: 'warning',
  running: 'info',
};

export default function ComplianceDashboard(): JSX.Element {
  const tenantId = import.meta.env.VITE_TENANT_ID || 'dev';
  const { data, loading, error, refetch } = useQuery<
    ComplianceDashboardResult,
    ComplianceDashboardVariables
  >(COMPLIANCE_DASHBOARD_QUERY, {
    variables: { tenantId, limit: 25 },
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
  });

  const dashboard = data?.complianceDashboard;

  const summary = useMemo(() => {
    if (!dashboard) {
      return {
        openFindings: 0,
        scanSuccessRate: 1,
        policyPassRate: 1,
        auditCount: 0,
      };
    }

    return {
      openFindings: dashboard.metrics.openFindings,
      scanSuccessRate: dashboard.metrics.scanSuccessRate,
      policyPassRate: dashboard.metrics.policyPassRate,
      auditCount: dashboard.auditLogs.length,
    };
  }, [dashboard]);

  const handleExportCsv = useCallback(() => {
    if (!dashboard) {
      return;
    }

    const rows: string[][] = [
      ['Section', 'Identifier', 'Type', 'Summary', 'Timestamp'],
    ];

    dashboard.auditLogs.forEach((log) => {
      rows.push([
        'Audit Log',
        log.id,
        log.action,
        `${log.resourceType}${log.resourceId ? ` • ${log.resourceId}` : ''}`,
        formatDate(log.createdAt),
      ]);
    });

    dashboard.securityScans.forEach((scan) => {
      rows.push([
        'Security Scan',
        scan.id,
        scan.scanType,
        `${scan.status.toUpperCase()} — ${scan.totalFindings} findings`,
        formatDate(scan.scannedAt),
      ]);
    });

    dashboard.policyValidations.forEach((validation) => {
      rows.push([
        'OPA Validation',
        validation.id,
        validation.policy,
        `${validation.allow ? 'ALLOW' : 'DENY'} — ${validation.decision}`,
        formatDate(validation.evaluatedAt),
      ]);
    });

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const safeCell = cell ?? '';
            const escaped = String(safeCell).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `compliance-report-${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [dashboard]);

  const handleExportPdf = useCallback(async () => {
    if (!dashboard) {
      return;
    }

    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF();
    const autoTable = (autoTableModule as { default: any }).default;

    doc.setFontSize(18);
    doc.text('Compliance Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${formatDate(dashboard.generatedAt)}`, 14, 28);
    doc.text(`Tenant: ${tenantId}`, 14, 34);

    doc.setFontSize(12);
    doc.text('Summary', 14, 44);
    doc.setFontSize(10);
    doc.text(
      `Open findings: ${summary.openFindings}\n` +
        `Security scan success: ${(summary.scanSuccessRate * 100).toFixed(1)}%\n` +
        `Policy pass rate: ${(summary.policyPassRate * 100).toFixed(1)}%\n` +
        `Audit events reviewed: ${summary.auditCount}`,
      14,
      50
    );

    autoTable(doc, {
      startY: 72,
      head: [['Section', 'Identifier', 'Details', 'Timestamp']],
      body: [
        ...dashboard.auditLogs.map((log) => [
          'Audit Log',
          log.id,
          `${log.action} • ${log.resourceType}${log.resourceId ? ` (${log.resourceId})` : ''}`,
          formatDate(log.createdAt),
        ]),
        ...dashboard.securityScans.map((scan) => [
          'Security Scan',
          scan.id,
          `${scan.scanType} — ${scan.status} (${scan.totalFindings} findings)`,
          formatDate(scan.scannedAt),
        ]),
        ...dashboard.policyValidations.map((validation) => [
          'OPA Validation',
          validation.id,
          `${validation.policy} — ${validation.allow ? 'ALLOW' : 'DENY'} (${validation.decision})`,
          formatDate(validation.evaluatedAt),
        ]),
      ],
      styles: { fontSize: 9 },
    });

    doc.save(`compliance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [dashboard, summary.auditCount, summary.openFindings, summary.policyPassRate, summary.scanSuccessRate, tenantId]);

  return (
    <Box sx={{ p: 3 }}>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon color="primary" /> Compliance Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Updated {dashboard ? formatDate(dashboard.generatedAt) : '—'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCsv}
            disabled={!dashboard}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPdf}
            disabled={!dashboard}
          >
            Export PDF
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error.message}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Open Findings
              </Typography>
              <Typography variant="h4">{summary.openFindings.toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">
                Critical and high severity issues awaiting remediation
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Scan Success Rate
              </Typography>
              <Typography variant="h4">
                {(summary.scanSuccessRate * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Trivy and OWASP ZAP scans passing in the last 24h
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Policy Pass Rate
              </Typography>
              <Typography variant="h4">
                {(summary.policyPassRate * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                OPA evaluations returning allow decisions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Audit Events Reviewed
              </Typography>
              <Typography variant="h4">{summary.auditCount.toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">
                Logged actions across the investigation platform
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Audit Activity
            </Typography>
            {dashboard?.auditLogs.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Action</TableCell>
                    <TableCell>Resource</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {log.resourceType || '—'}
                        </Typography>
                        {log.resourceId && (
                          <Typography variant="caption" color="text.secondary">
                            ID: {log.resourceId}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.userEmail || log.userId || 'Unknown user'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.userRole || 'role n/a'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={previewJson(log.details)}>
                          <span>{previewJson(log.details)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No audit activity available for this tenant yet.
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Prometheus Signals
            </Typography>
            {dashboard?.metrics.promMetrics.length ? (
              <List dense>
                {dashboard.metrics.promMetrics.map((metric, index) => (
                  <ListItem key={`${metric.name}-${index}`} sx={{ alignItems: 'flex-start' }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={600}>
                          {metric.name}: {metric.value.toFixed(2)}
                        </Typography>
                      }
                      secondary={
                        metric.labels ? (
                          <Typography variant="caption" color="text.secondary">
                            {previewJson(metric.labels)}
                          </Typography>
                        ) : null
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No Prometheus metrics detected. Configure PROMETHEUS_URL to enrich this panel.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Security Scans (Trivy & OWASP ZAP)
            </Typography>
            {dashboard?.securityScans.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Scan</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Critical</TableCell>
                    <TableCell align="right">High</TableCell>
                    <TableCell align="right">Medium</TableCell>
                    <TableCell align="right">Low</TableCell>
                    <TableCell>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.securityScans.map((scan) => {
                    const color = STATUS_COLOR[scan.status.toLowerCase()] ?? 'default';
                    return (
                      <TableRow key={scan.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {scan.scanType}
                          </Typography>
                          {scan.target && (
                            <Typography variant="caption" color="text.secondary">
                              Target: {scan.target}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={color}
                            label={scan.status.toUpperCase()}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                          {scan.criticalCount}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {scan.highCount}
                        </TableCell>
                        <TableCell align="right">{scan.mediumCount}</TableCell>
                        <TableCell align="right">{scan.lowCount}</TableCell>
                        <TableCell>{formatDate(scan.scannedAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No security scan records have been ingested for this tenant.
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              OPA Policy Validations
            </Typography>
            {dashboard?.policyValidations.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Policy</TableCell>
                    <TableCell>Decision</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Evaluated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboard.policyValidations.map((validation) => (
                    <TableRow key={validation.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {validation.policy}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={validation.allow ? 'success' : 'error'}
                          label={validation.allow ? 'ALLOW' : 'DENY'}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          {validation.decision}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={previewJson(validation.metadata)}>
                          <span>{validation.reason || previewJson(validation.metadata)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{formatDate(validation.evaluatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No OPA policy validations have been recorded for this tenant.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="body2" color="text.secondary">
        Export actions provide a CSV summary for spreadsheet workflows and a PDF snapshot suitable for
        compliance evidence packages. Metrics automatically refresh every 60 seconds.
      </Typography>
    </Box>
  );
}
