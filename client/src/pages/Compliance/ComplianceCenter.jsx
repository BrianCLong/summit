/**
 * Compliance Center Page
 *
 * Compliance framework management and audit readiness dashboard.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC4.2 (Evidence)
 *
 * @module pages/Compliance/ComplianceCenter
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Assessment,
  Description,
  Category,
  Timeline,
} from '@mui/icons-material';
import { ComplianceAPI } from '../../services/compliance-api';

// Status colors
const statusColors = {
  compliant: 'success',
  non_compliant: 'error',
  partial: 'warning',
  not_assessed: 'default',
};

// Readiness colors
const readinessColors = {
  ready: 'success',
  mostly_ready: 'info',
  needs_work: 'warning',
  not_ready: 'error',
};

// Tab Panel
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Framework Selector
function FrameworkSelector({ value, onChange, frameworks }) {
  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel>Framework</InputLabel>
      <Select value={value} label="Framework" onChange={(e) => onChange(e.target.value)}>
        {frameworks.map((f) => (
          <MenuItem key={f.id} value={f.id}>
            {f.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// Compliance Summary Card
function ComplianceSummary({ framework }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!framework) return;
      try {
        setLoading(true);
        const response = await ComplianceAPI.getSummary(framework);
        setSummary(response.data);
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [framework]);

  if (loading) return <LinearProgress />;
  if (!summary) return null;

  return (
    <Grid container spacing={3}>
      {/* Overall Score */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
              <CircularProgress
                variant="determinate"
                value={summary.overallScore}
                size={120}
                thickness={4}
                color={summary.status === 'compliant' ? 'success' : 'warning'}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h3">{summary.overallScore}%</Typography>
              </Box>
            </Box>
            <Typography variant="h6" gutterBottom>
              Overall Compliance
            </Typography>
            <Chip
              label={summary.status.replace('_', ' ').toUpperCase()}
              color={statusColors[summary.status]}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Control Summary */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Control Summary
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary={`${summary.controlSummary.compliant} Compliant`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Warning color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary={`${summary.controlSummary.partial} Partial`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Error color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={`${summary.controlSummary.nonCompliant} Non-Compliant`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Category color="disabled" />
                </ListItemIcon>
                <ListItemText
                  primary={`${summary.controlSummary.notAssessed} Not Assessed`}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Category Breakdown */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              By Category
            </Typography>
            {summary.categoryBreakdown?.slice(0, 4).map((cat) => (
              <Box key={cat.category} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: '60%' }}>
                    {cat.category}
                  </Typography>
                  <Typography variant="body2">{cat.score}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={cat.score}
                  color={cat.score >= 80 ? 'success' : cat.score >= 50 ? 'warning' : 'error'}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// Audit Readiness Component
function AuditReadiness({ framework }) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadiness = async () => {
      if (!framework) return;
      try {
        setLoading(true);
        const response = await ComplianceAPI.getReadiness(framework);
        setReadiness(response.data);
      } catch (err) {
        console.error('Failed to fetch readiness:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReadiness();
  }, [framework]);

  if (loading) return <LinearProgress />;
  if (!readiness) return null;

  return (
    <Box>
      {/* Readiness Score */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom>
                Audit Readiness
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h2">{readiness.overallScore}%</Typography>
                <Chip
                  label={readiness.readinessLevel.replace('_', ' ').toUpperCase()}
                  color={readinessColors[readiness.readinessLevel]}
                  size="large"
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Recommendations
              </Typography>
              {readiness.recommendations.map((rec, i) => (
                <Alert key={i} severity="info" sx={{ mb: 1 }}>
                  {rec}
                </Alert>
              ))}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Gaps */}
      {readiness.gaps.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance Gaps ({readiness.gaps.length})
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Control</TableCell>
                    <TableCell>Gap Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Remediation</TableCell>
                    <TableCell>Effort</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {readiness.gaps.map((gap, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {gap.controlId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {gap.controlName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={gap.gapType.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={gap.severity}
                          size="small"
                          color={
                            gap.severity === 'critical'
                              ? 'error'
                              : gap.severity === 'high'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{gap.remediation}</TableCell>
                      <TableCell>
                        <Chip label={gap.effort} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// Controls List Component
function ControlsList({ framework }) {
  const [controls, setControls] = useState([]);
  const [assessments, setAssessments] = useState({});
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(null);

  const fetchData = useCallback(async () => {
    if (!framework) return;
    try {
      setLoading(true);
      const [controlsRes, assessmentsRes] = await Promise.all([
        ComplianceAPI.getControls(framework),
        ComplianceAPI.getAssessments(framework),
      ]);
      setControls(controlsRes.data || []);
      const assessmentMap = {};
      (assessmentsRes.data || []).forEach((a) => {
        assessmentMap[a.controlId] = a;
      });
      setAssessments(assessmentMap);
    } catch (err) {
      console.error('Failed to fetch controls:', err);
    } finally {
      setLoading(false);
    }
  }, [framework]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssess = async (controlId) => {
    try {
      setAssessing(controlId);
      await ComplianceAPI.assessControl(framework, controlId);
      await fetchData();
    } catch (err) {
      console.error('Failed to assess control:', err);
    } finally {
      setAssessing(null);
    }
  };

  if (loading) return <LinearProgress />;

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Control</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Frequency</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Score</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {controls.map((control) => {
            const assessment = assessments[control.id];
            return (
              <TableRow key={control.id}>
                <TableCell>{control.id}</TableCell>
                <TableCell>
                  <Tooltip title={control.requirement}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {control.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {control.description}
                      </Typography>
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>{control.category}</TableCell>
                <TableCell>
                  <Chip label={control.frequency} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={assessment?.status || 'not_assessed'}
                    size="small"
                    color={statusColors[assessment?.status] || 'default'}
                  />
                </TableCell>
                <TableCell>
                  {assessment ? `${assessment.score}%` : '-'}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    onClick={() => handleAssess(control.id)}
                    disabled={assessing === control.id}
                    startIcon={
                      assessing === control.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Assessment />
                      )
                    }
                  >
                    {assessing === control.id ? 'Assessing...' : 'Assess'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Main Component
export default function ComplianceCenter() {
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState('SOC2');
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFrameworks = async () => {
      try {
        const response = await ComplianceAPI.getFrameworks();
        setFrameworks(response.data || []);
      } catch (err) {
        console.error('Failed to fetch frameworks:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFrameworks();
  }, []);

  if (loading) return <LinearProgress />;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Compliance Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage compliance frameworks, track controls, and prepare for audits.
          </Typography>
        </Box>
        <FrameworkSelector
          value={selectedFramework}
          onChange={setSelectedFramework}
          frameworks={frameworks}
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab icon={<Assessment />} label="Overview" iconPosition="start" />
          <Tab icon={<Timeline />} label="Audit Readiness" iconPosition="start" />
          <Tab icon={<Category />} label="Controls" iconPosition="start" />
          <Tab icon={<Description />} label="Evidence" iconPosition="start" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ComplianceSummary framework={selectedFramework} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <AuditReadiness framework={selectedFramework} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ControlsList framework={selectedFramework} />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Alert severity="info">
          Evidence management interface - View, upload, and verify compliance evidence.
        </Alert>
      </TabPanel>
    </Container>
  );
}
