import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  MoreVert,
  FilterList,
  FileDownload,
  ZoomIn,
  Info,
} from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const ATTACK_COVERAGE_QUERY = gql`
  query GetAttackCoverage(
    $timeRange: String!
    $filters: AttackCoverageFilters
  ) {
    attackCoverage(timeRange: $timeRange, filters: $filters) {
      tactics {
        id
        name
        techniques {
          id
          name
          subTechniques {
            id
            name
          }
          coverage {
            detectionRules
            alertCount
            severity
            lastDetected
            falsePositiveRate
          }
          alerts {
            count
            severity
            trend
          }
        }
      }
      summary {
        totalTechniques
        coveredTechniques
        coveragePercentage
        topTactics
        recentActivity
      }
    }
  }
`;

interface AttackTechnique {
  id: string;
  name: string;
  coverage: {
    detectionRules: number;
    alertCount: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    lastDetected?: string;
    falsePositiveRate: number;
  };
  alerts: {
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    trend: 'up' | 'down' | 'stable';
  };
}

interface AttackTactic {
  id: string;
  name: string;
  techniques: AttackTechnique[];
}

interface AttackHeatmapWidgetProps {
  timeRange?: string;
  height?: number;
  onTechniqueClick?: (technique: AttackTechnique) => void;
}

const MITRE_TACTICS = [
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
];

export default function AttackHeatmapWidget({
  timeRange = '7d',
  height = 600,
  onTechniqueClick,
}: AttackHeatmapWidgetProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    tactics: [],
    severity: [],
    hasAlerts: false,
  });
  const [selectedTechnique, setSelectedTechnique] =
    useState<AttackTechnique | null>(null);
  const [techniqueDialogOpen, setTechniqueDialogOpen] = useState(false);

  const { data, loading, error } = useQuery(ATTACK_COVERAGE_QUERY, {
    variables: {
      timeRange,
      filters: selectedFilters,
    },
    pollInterval: 300000, // Refresh every 5 minutes
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExport = () => {
    if (!data?.attackCoverage) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      timeRange,
      summary: data.attackCoverage.summary,
      tactics: data.attackCoverage.tactics,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attack-coverage-${timeRange}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    handleMenuClose();
  };

  const getCoverageColor = (technique: AttackTechnique) => {
    const { coverage, alerts } = technique;

    if (alerts.count === 0 && coverage.detectionRules === 0) {
      return '#f5f5f5'; // No coverage
    }

    if (alerts.count > 0) {
      // Color based on alert severity and count
      const intensity = Math.min(alerts.count / 10, 1); // Cap at 10 alerts
      switch (alerts.severity) {
        case 'critical':
          return `rgba(211, 47, 47, ${0.3 + intensity * 0.7})`;
        case 'high':
          return `rgba(245, 124, 0, ${0.3 + intensity * 0.7})`;
        case 'medium':
          return `rgba(255, 193, 7, ${0.3 + intensity * 0.7})`;
        default:
          return `rgba(76, 175, 80, ${0.3 + intensity * 0.7})`;
      }
    }

    if (coverage.detectionRules > 0) {
      // Detection coverage only
      const intensity = Math.min(coverage.detectionRules / 5, 1);
      return `rgba(63, 81, 181, ${0.2 + intensity * 0.5})`;
    }

    return '#e0e0e0';
  };

  const getTechniqueTooltip = (technique: AttackTechnique) => {
    const { coverage, alerts } = technique;
    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          {technique.id}: {technique.name}
        </Typography>
        <Typography variant="body2">
          Detection Rules: {coverage.detectionRules}
        </Typography>
        <Typography variant="body2">Recent Alerts: {alerts.count}</Typography>
        {alerts.count > 0 && (
          <Typography variant="body2">
            Severity: {alerts.severity.toUpperCase()}
          </Typography>
        )}
        {coverage.lastDetected && (
          <Typography variant="body2">
            Last Detected:{' '}
            {new Date(coverage.lastDetected).toLocaleDateString()}
          </Typography>
        )}
        <Typography variant="body2">
          FP Rate: {(coverage.falsePositiveRate * 100).toFixed(1)}%
        </Typography>
      </Box>
    );
  };

  const handleTechniqueClick = (technique: AttackTechnique) => {
    setSelectedTechnique(technique);
    setTechniqueDialogOpen(true);
    if (onTechniqueClick) {
      onTechniqueClick(technique);
    }
  };

  const renderHeatmapCell = (
    technique: AttackTechnique,
    tacticIndex: number,
    techniqueIndex: number,
  ) => (
    <Tooltip
      key={`${technique.id}`}
      title={getTechniqueTooltip(technique)}
      arrow
    >
      <Box
        sx={{
          width: 40,
          height: 30,
          backgroundColor: getCoverageColor(technique),
          border: '1px solid #ddd',
          cursor: 'pointer',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          color: technique.alerts.count > 0 ? '#fff' : '#666',
          '&:hover': {
            transform: 'scale(1.1)',
            zIndex: 1,
            boxShadow: 2,
          },
        }}
        onClick={() => handleTechniqueClick(technique)}
      >
        {technique.alerts.count > 0 && technique.alerts.count}
        {technique.alerts.trend === 'up' && (
          <Box component="span" sx={{ fontSize: '8px', ml: 0.5 }}>
            ↗
          </Box>
        )}
      </Box>
    </Tooltip>
  );

  const renderLegend = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mt: 2,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
          }}
        />
        <Typography variant="caption">No Coverage</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(63, 81, 181, 0.5)',
            border: '1px solid #ddd',
          }}
        />
        <Typography variant="caption">Detection Only</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(76, 175, 80, 0.7)',
            border: '1px solid #ddd',
          }}
        />
        <Typography variant="caption">Low Alerts</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(255, 193, 7, 0.7)',
            border: '1px solid #ddd',
          }}
        />
        <Typography variant="caption">Medium Alerts</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(245, 124, 0, 0.7)',
            border: '1px solid #ddd',
          }}
        />
        <Typography variant="caption">High Alerts</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: 'rgba(211, 47, 47, 0.7)',
            border: '1px solid #ddd',
          }}
        />
        <Typography variant="caption">Critical Alerts</Typography>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ATT&CK Coverage Heatmap
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50%',
            }}
          >
            <LinearProgress sx={{ width: '50%' }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Typography variant="h6" color="error">
            Error Loading ATT&CK Coverage
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error.message}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { tactics = [], summary = {} } = data?.attackCoverage || {};

  return (
    <>
      <Card sx={{ height }}>
        <CardContent>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6">ATT&CK Coverage Heatmap</Typography>
              <Typography variant="body2" color="text.secondary">
                {summary.coveragePercentage}% technique coverage (
                {summary.coveredTechniques}/{summary.totalTechniques})
              </Typography>
            </Box>
            <Box>
              <IconButton onClick={handleMenuClick}>
                <MoreVert />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={() => setFilterDialogOpen(true)}>
                  <FilterList sx={{ mr: 1 }} />
                  Filter
                </MenuItem>
                <MenuItem onClick={handleExport}>
                  <FileDownload sx={{ mr: 1 }} />
                  Export Data
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          {/* Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {summary.totalTechniques || 0}
                </Typography>
                <Typography variant="caption">Total Techniques</Typography>
              </Box>
            </Grid>
            <Grid size={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {summary.coveredTechniques || 0}
                </Typography>
                <Typography variant="caption">Covered</Typography>
              </Box>
            </Grid>
            <Grid size={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {summary.recentActivity || 0}
                </Typography>
                <Typography variant="caption">Recent Alerts</Typography>
              </Box>
            </Grid>
            <Grid size={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {(summary.coveragePercentage || 0).toFixed(0)}%
                </Typography>
                <Typography variant="caption">Coverage</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Heatmap Grid */}
          <Box sx={{ overflowX: 'auto', maxHeight: height - 200 }}>
            <Box sx={{ minWidth: 800 }}>
              {/* Tactic Headers */}
              <Box sx={{ display: 'flex', mb: 1 }}>
                <Box sx={{ width: 150 }} /> {/* Space for technique labels */}
                {MITRE_TACTICS.map((tactic, index) => (
                  <Box
                    key={tactic}
                    sx={{
                      width: 120,
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'center',
                      height: 60,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}
                  >
                    {tactic}
                  </Box>
                ))}
              </Box>

              {/* Technique Rows */}
              {tactics.map((tactic: AttackTactic) =>
                tactic.techniques.map(
                  (technique: AttackTechnique, techIndex: number) => (
                    <Box
                      key={technique.id}
                      sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}
                    >
                      <Box
                        sx={{
                          width: 150,
                          fontSize: '11px',
                          pr: 1,
                          textAlign: 'right',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Tooltip title={technique.name}>
                          <span>{technique.id}</span>
                        </Tooltip>
                      </Box>
                      {MITRE_TACTICS.map((tacticName, tacticIndex) => (
                        <Box
                          key={`${technique.id}-${tacticName}`}
                          sx={{
                            width: 120,
                            display: 'flex',
                            justifyContent: 'center',
                          }}
                        >
                          {tactic.name === tacticName ? (
                            renderHeatmapCell(technique, tacticIndex, techIndex)
                          ) : (
                            <Box sx={{ width: 40, height: 30 }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                  ),
                ),
              )}
            </Box>
          </Box>

          {renderLegend()}
        </CardContent>
      </Card>

      {/* Technique Detail Dialog */}
      <Dialog
        open={techniqueDialogOpen}
        onClose={() => setTechniqueDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedTechnique && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">
                  {selectedTechnique.id}: {selectedTechnique.name}
                </Typography>
                <Chip
                  size="small"
                  label={selectedTechnique.alerts.severity}
                  color={
                    selectedTechnique.alerts.severity === 'critical'
                      ? 'error'
                      : selectedTechnique.alerts.severity === 'high'
                        ? 'warning'
                        : 'default'
                  }
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Detection Coverage
                  </Typography>
                  <Typography variant="body2">
                    Rules: {selectedTechnique.coverage.detectionRules}
                  </Typography>
                  <Typography variant="body2">
                    False Positive Rate:{' '}
                    {(
                      selectedTechnique.coverage.falsePositiveRate * 100
                    ).toFixed(1)}
                    %
                  </Typography>
                  {selectedTechnique.coverage.lastDetected && (
                    <Typography variant="body2">
                      Last Detection:{' '}
                      {new Date(
                        selectedTechnique.coverage.lastDetected,
                      ).toLocaleString()}
                    </Typography>
                  )}
                </Grid>
                <Grid size={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Alert Activity
                  </Typography>
                  <Typography variant="body2">
                    Recent Alerts: {selectedTechnique.alerts.count}
                  </Typography>
                  <Typography variant="body2">
                    Trend: {selectedTechnique.alerts.trend.toUpperCase()}
                  </Typography>
                  <Typography variant="body2">
                    Severity: {selectedTechnique.alerts.severity.toUpperCase()}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTechniqueDialogOpen(false)}>
                Close
              </Button>
              <Button variant="contained" startIcon={<ZoomIn />}>
                View Details
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filter ATT&CK Coverage</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Tactics</InputLabel>
                <Select
                  multiple
                  value={selectedFilters.tactics}
                  onChange={(e) =>
                    setSelectedFilters({
                      ...selectedFilters,
                      tactics: e.target.value as string[],
                    })
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {MITRE_TACTICS.map((tactic) => (
                    <MenuItem key={tactic} value={tactic}>
                      {tactic}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Alert Severity</InputLabel>
                <Select
                  multiple
                  value={selectedFilters.severity}
                  onChange={(e) =>
                    setSelectedFilters({
                      ...selectedFilters,
                      severity: e.target.value as string[],
                    })
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {['low', 'medium', 'high', 'critical'].map((severity) => (
                    <MenuItem key={severity} value={severity}>
                      {severity.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setFilterDialogOpen(false);
              // Trigger refetch with new filters
            }}
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
