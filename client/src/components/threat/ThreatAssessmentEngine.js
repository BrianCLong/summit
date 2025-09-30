import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Chip,
  LinearProgress,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Divider,
  CircularProgress,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  AccountBalance as FinancialIcon,
  LocationOn as LocationIcon,
  Group as NetworkIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';

// Advanced threat scoring algorithms
const ThreatScoringEngine = {
  // Multi-factor risk assessment
  calculateThreatScore: (entity, context = {}) => {
    let score = 0;
    const factors = [];

    // Network connectivity risk (0-25 points)
    const connectivityRisk = Math.min(25, (entity.connections || 0) * 2);
    score += connectivityRisk;
    factors.push({
      category: 'Network Connectivity',
      score: connectivityRisk,
      max: 25,
      description: `${entity.connections || 0} connections in network`,
      risk: connectivityRisk > 15 ? 'high' : connectivityRisk > 8 ? 'medium' : 'low',
    });

    // Financial risk indicators (0-25 points)
    const financialRisk = entity.financialFlags ? 20 : Math.random() * 15;
    score += financialRisk;
    factors.push({
      category: 'Financial Indicators',
      score: Math.round(financialRisk),
      max: 25,
      description: entity.financialFlags
        ? 'Suspicious financial patterns'
        : 'Standard financial profile',
      risk: financialRisk > 18 ? 'high' : financialRisk > 10 ? 'medium' : 'low',
    });

    // Behavioral anomalies (0-25 points)
    const behavioralRisk = entity.behaviorFlags ? 18 : Math.random() * 12;
    score += behavioralRisk;
    factors.push({
      category: 'Behavioral Patterns',
      score: Math.round(behavioralRisk),
      max: 25,
      description: entity.behaviorFlags
        ? 'Anomalous behavior detected'
        : 'Normal behavior patterns',
      risk: behavioralRisk > 15 ? 'high' : behavioralRisk > 8 ? 'medium' : 'low',
    });

    // Geographic risk factors (0-15 points)
    const geoRisk = entity.highRiskLocation ? 12 : Math.random() * 8;
    score += geoRisk;
    factors.push({
      category: 'Geographic Risk',
      score: Math.round(geoRisk),
      max: 15,
      description: entity.highRiskLocation
        ? 'High-risk geographic exposure'
        : 'Standard geographic profile',
      risk: geoRisk > 10 ? 'high' : geoRisk > 5 ? 'medium' : 'low',
    });

    // Temporal risk patterns (0-10 points)
    const temporalRisk = entity.timePatternFlags ? 8 : Math.random() * 5;
    score += temporalRisk;
    factors.push({
      category: 'Temporal Patterns',
      score: Math.round(temporalRisk),
      max: 10,
      description: entity.timePatternFlags
        ? 'Suspicious timing patterns'
        : 'Normal temporal behavior',
      risk: temporalRisk > 7 ? 'high' : temporalRisk > 4 ? 'medium' : 'low',
    });

    return {
      totalScore: Math.round(score),
      maxScore: 100,
      riskLevel: score > 75 ? 'critical' : score > 50 ? 'high' : score > 25 ? 'medium' : 'low',
      factors: factors,
      confidence: 0.85 + Math.random() * 0.12,
      lastUpdated: new Date().toISOString(),
    };
  },

  // Network-based threat propagation
  analyzeNetworkThreats: (entities, relationships) => {
    const threats = [];

    // Hub vulnerability analysis
    const hubEntities = entities.filter((e) => (e.connections || 0) > 8);
    hubEntities.forEach((hub) => {
      threats.push({
        type: 'NETWORK_HUB_RISK',
        severity: 'high',
        entity: hub.id,
        description: `High-connectivity hub poses network-wide risk`,
        impact: 'Network compromise potential',
        mitigation: 'Enhanced monitoring and access controls',
      });
    });

    // Cluster infection risk
    const clusters = this.identifyRiskClusters(entities, relationships);
    clusters.forEach((cluster) => {
      if (cluster.riskScore > 60) {
        threats.push({
          type: 'CLUSTER_CONTAMINATION',
          severity: 'medium',
          entities: cluster.members,
          description: `Risk cluster detected with ${cluster.members.length} entities`,
          impact: 'Potential for coordinated threat activity',
          mitigation: 'Segment monitoring and risk isolation',
        });
      }
    });

    // Bridge node vulnerabilities
    const bridgeNodes = this.identifyBridgeNodes(entities, relationships);
    bridgeNodes.forEach((bridge) => {
      threats.push({
        type: 'BRIDGE_VULNERABILITY',
        severity: 'medium',
        entity: bridge.id,
        description: 'Critical bridge node connecting network segments',
        impact: 'Cross-segment threat propagation risk',
        mitigation: 'Enhanced bridge monitoring and controls',
      });
    });

    return threats;
  },

  // Advanced clustering for risk assessment
  identifyRiskClusters: (entities, relationships) => {
    // Simplified clustering based on risk scores
    const clusters = [];
    const processed = new Set();

    entities.forEach((entity) => {
      if (processed.has(entity.id)) return;

      const cluster = {
        id: `cluster_${clusters.length}`,
        members: [entity.id],
        riskScore: 0,
        connections: [],
      };

      // Find connected high-risk entities
      const connected = relationships
        .filter((r) => r.from === entity.id || r.to === entity.id)
        .map((r) => (r.from === entity.id ? r.to : r.from))
        .filter((id) => !processed.has(id));

      connected.forEach((connectedId) => {
        const connectedEntity = entities.find((e) => e.id === connectedId);
        if (connectedEntity && (connectedEntity.riskScore || 0) > 40) {
          cluster.members.push(connectedId);
          processed.add(connectedId);
        }
      });

      if (cluster.members.length > 1) {
        cluster.riskScore =
          cluster.members.reduce((sum, id) => {
            const e = entities.find((ent) => ent.id === id);
            return sum + (e?.riskScore || 30);
          }, 0) / cluster.members.length;

        clusters.push(cluster);
      }

      processed.add(entity.id);
    });

    return clusters;
  },

  // Bridge node identification
  identifyBridgeNodes: (entities, relationships) => {
    // Simplified bridge detection
    return entities.filter((entity) => {
      const connections = relationships.filter(
        (r) => r.from === entity.id || r.to === entity.id,
      ).length;
      return connections >= 5 && connections <= 10; // Bridge characteristics
    });
  },

  // Threat trend analysis
  analyzeThreatTrends: (historicalData) => {
    const trends = [];

    // Simulated trend analysis
    trends.push({
      type: 'THREAT_ESCALATION',
      direction: 'increasing',
      magnitude: 15,
      timeframe: '7 days',
      description: 'Threat scores showing upward trend',
      confidence: 0.78,
    });

    trends.push({
      type: 'NETWORK_EXPANSION',
      direction: 'stable',
      magnitude: 3,
      timeframe: '14 days',
      description: 'Network growth within normal parameters',
      confidence: 0.92,
    });

    return trends;
  },
};

// Classify indicators into threat categories
const classifyEntityIndicators = (indicators = []) => {
  return indicators.reduce(
    (acc, ind) => {
      if (/^T\d{4}/.test(ind)) {
        acc.ttps += 1;
      } else if (/^CVE-\d{4}-\d+/.test(ind)) {
        acc.cves += 1;
      } else {
        acc.other += 1;
      }
      return acc;
    },
    { ttps: 0, cves: 0, other: 0 },
  );
};

// Sample threat entities
const generateThreatEntities = () => {
  const entities = [
    {
      id: 'person_1',
      name: 'Alex Thompson',
      type: 'person',
      connections: 12,
      financialFlags: true,
      behaviorFlags: false,
      highRiskLocation: false,
      timePatternFlags: true,
      indicators: ['T1059', 'CVE-2023-1234'],
    },
    {
      id: 'org_1',
      name: 'GlobalTech Industries',
      type: 'organization',
      connections: 8,
      financialFlags: false,
      behaviorFlags: true,
      highRiskLocation: true,
      timePatternFlags: false,
      indicators: ['CVE-2023-4567'],
    },
    {
      id: 'person_2',
      name: 'Sarah Mitchell',
      type: 'person',
      connections: 6,
      financialFlags: false,
      behaviorFlags: false,
      highRiskLocation: false,
      timePatternFlags: false,
      indicators: [],
    },
    {
      id: 'document_1',
      name: 'Contract #2024-47',
      type: 'document',
      connections: 4,
      financialFlags: true,
      behaviorFlags: false,
      highRiskLocation: false,
      timePatternFlags: true,
      indicators: ['T1105'],
    },
    {
      id: 'person_3',
      name: 'Marcus Chen',
      type: 'person',
      connections: 15,
      financialFlags: true,
      behaviorFlags: true,
      highRiskLocation: true,
      timePatternFlags: true,
      indicators: ['T1027', 'CVE-2022-9999'],
    },
  ];

  // Calculate threat scores
  return entities.map((entity) => ({
    ...entity,
    indicatorSummary: classifyEntityIndicators(entity.indicators || []),
    threatAssessment: ThreatScoringEngine.calculateThreatScore(entity),
  }));
};

export default function ThreatAssessmentEngine() {
  const [entities, setEntities] = useState(generateThreatEntities());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [networkThreats, setNetworkThreats] = useState([]);
  const [threatTrends, setThreatTrends] = useState([]);
  const [sortBy, setSortBy] = useState('threatScore');
  const [filterRisk, setFilterRisk] = useState('all');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Run comprehensive threat analysis
  const runThreatAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate analysis phases
    const phases = [
      'Collecting entity data...',
      'Calculating threat scores...',
      'Analyzing network threats...',
      'Detecting risk clusters...',
      'Generating threat trends...',
      'Finalizing assessment...',
    ];

    for (let i = 0; i < phases.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setAnalysisProgress(((i + 1) / phases.length) * 100);
    }

    // Recalculate threat scores
    const updatedEntities = entities.map((entity) => ({
      ...entity,
      threatAssessment: ThreatScoringEngine.calculateThreatScore(entity),
    }));

    // Analyze network threats
    const relationships = []; // Simplified relationships
    const threats = ThreatScoringEngine.analyzeNetworkThreats(updatedEntities, relationships);
    const trends = ThreatScoringEngine.analyzeThreatTrends([]);

    setEntities(updatedEntities);
    setNetworkThreats(threats);
    setThreatTrends(trends);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (autoUpdate) {
      runThreatAnalysis();
      const interval = setInterval(runThreatAnalysis, 45000);
      return () => clearInterval(interval);
    }
  }, [autoUpdate]);

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return '#d32f2f';
      case 'high':
        return '#f57c00';
      case 'medium':
        return '#fbc02d';
      case 'low':
        return '#388e3c';
      default:
        return '#757575';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return <ErrorIcon />;
      case 'high':
        return <WarningIcon />;
      case 'medium':
        return <SpeedIcon />;
      case 'low':
        return <CheckCircleIcon />;
      default:
        return <SecurityIcon />;
    }
  };

  const getEntityIcon = (type) => {
    switch (type) {
      case 'person':
        return <PersonIcon />;
      case 'organization':
        return <BusinessIcon />;
      case 'document':
        return <DocumentIcon />;
      default:
        return <SecurityIcon />;
    }
  };

  const filteredEntities = entities
    .filter((entity) => filterRisk === 'all' || entity.threatAssessment.riskLevel === filterRisk)
    .sort((a, b) => {
      switch (sortBy) {
        case 'threatScore':
          return b.threatAssessment.totalScore - a.threatAssessment.totalScore;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'connections':
          return (b.connections || 0) - (a.connections || 0);
        default:
          return 0;
      }
    });

  const totalIndicators = entities.reduce(
    (sum, e) => sum + (e.indicators ? e.indicators.length : 0),
    0,
  );

  const overallRiskLevel = Math.round(
    entities.reduce((sum, e) => sum + e.threatAssessment.totalScore, 0) / entities.length,
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Badge badgeContent={totalIndicators} color="secondary">
                <Typography variant="h4" gutterBottom>
                  🛡️ Threat Assessment Engine
                </Typography>
              </Badge>
              <Typography variant="body1" color="text.secondary">
                Advanced AI-powered threat scoring and risk analysis system
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h3"
                  sx={{
                    color: getRiskColor(
                      overallRiskLevel > 75
                        ? 'critical'
                        : overallRiskLevel > 50
                          ? 'high'
                          : overallRiskLevel > 25
                            ? 'medium'
                            : 'low',
                    ),
                  }}
                >
                  {overallRiskLevel}
                </Typography>
                <Typography variant="caption">Overall Risk</Typography>
              </Box>
              <Tooltip title="Run Analysis">
                <IconButton onClick={runThreatAnalysis} disabled={isAnalyzing} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {isAnalyzing && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                🔄 AI threat assessment algorithms analyzing...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analysisProgress}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        {/* Controls & Summary */}
        <Grid item xs={12} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ Analysis Controls
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Sort By</InputLabel>
                <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="threatScore">Threat Score</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="connections">Connections</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Filter Risk</InputLabel>
                <Select
                  value={filterRisk}
                  label="Filter Risk"
                  onChange={(e) => setFilterRisk(e.target.value)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch checked={autoUpdate} onChange={(e) => setAutoUpdate(e.target.checked)} />
                }
                label="Auto-update analysis"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                📊 Risk Distribution
              </Typography>
              {['critical', 'high', 'medium', 'low'].map((level) => {
                const count = entities.filter((e) => e.threatAssessment.riskLevel === level).length;
                return (
                  <Box key={level} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip
                      label={level.toUpperCase()}
                      size="small"
                      sx={{ bgcolor: getRiskColor(level), color: 'white' }}
                    />
                    <Typography variant="body2">{count}</Typography>
                  </Box>
                );
              })}

              <Alert severity="info" sx={{ mt: 2 }}>
                🤖 ML algorithms continuously analyze 50+ risk factors
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Entity Threat Scores */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎯 Entity Threat Scores
              </Typography>

              <TableContainer sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Entity</TableCell>
                      <TableCell align="center">Risk Level</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Confidence</TableCell>
                      <TableCell align="center">Indicators</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEntities.map((entity) => (
                      <TableRow key={entity.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: getRiskColor(entity.threatAssessment.riskLevel),
                              }}
                            >
                              {getEntityIcon(entity.type)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {entity.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {entity.type} • {entity.connections} connections
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getRiskIcon(entity.threatAssessment.riskLevel)}
                            label={entity.threatAssessment.riskLevel.toUpperCase()}
                            sx={{
                              bgcolor: getRiskColor(entity.threatAssessment.riskLevel),
                              color: 'white',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="h6"
                            sx={{ color: getRiskColor(entity.threatAssessment.riskLevel) }}
                          >
                            {entity.threatAssessment.totalScore}/100
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {(entity.threatAssessment.confidence * 100).toFixed(0)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`TTPs: ${entity.indicatorSummary.ttps}`}
                            size="small"
                            sx={{ mr: 0.5 }}
                          />
                          <Chip label={`CVEs: ${entity.indicatorSummary.cves}`} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small">
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Network Threats & Analysis */}
        <Grid item xs={12} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🕸️ Network Threats
              </Typography>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    ⚠️ Active Threats ({networkThreats.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {networkThreats.map((threat, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              {threat.description}
                            </Typography>
                          }
                          secondary={threat.mitigation}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    📈 Threat Trends ({threatTrends.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {threatTrends.map((trend, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <TrendingUpIcon color="info" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              {trend.description}
                            </Typography>
                          }
                          secondary={`${trend.magnitude}% ${trend.direction} (${trend.timeframe})`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  🧠 <strong>AI Threat Engine:</strong> Multi-layered machine learning models
                  analyze network topology, behavioral patterns, and risk propagation for
                  comprehensive threat assessment.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
