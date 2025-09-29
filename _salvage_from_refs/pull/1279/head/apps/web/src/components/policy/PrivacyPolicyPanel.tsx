/**
 * Privacy Policy Management Panel
 *
 * Interface for managing privacy policies, data classification,
 * retention settings, and PII detection configuration.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useTenant } from '../../hooks/useTenant';
import { logger } from '../../utils/logger';

// GraphQL queries and mutations
const EVALUATE_PRIVACY_POLICY = gql`
  query EvaluatePrivacyPolicy($input: PrivacyPolicyInput!) {
    evaluatePrivacyPolicy(input: $input) {
      allowed
      dataClassification
      retentionTier
      redactionLevel
      consentRequired
      geoRestrictions
      piiDetected {
        type
        field
        confidence
        location
        pattern
      }
    }
  }
`;

// Mock data for demonstration
const mockPrivacySettings = {
  dataClassifications: [
    { id: 'public', name: 'Public', description: 'Publicly available information' },
    { id: 'internal', name: 'Internal', description: 'Internal business information' },
    { id: 'confidential', name: 'Confidential', description: 'Confidential business information' },
    { id: 'restricted', name: 'Restricted', description: 'Highly sensitive information' },
    { id: 'secret', name: 'Secret', description: 'Top secret information' }
  ],
  retentionTiers: [
    { id: 'short', name: 'Short (30 days)', period: '30d' },
    { id: 'medium', name: 'Medium (1 year)', period: '1y' },
    { id: 'long', name: 'Long (7 years)', period: '7y' },
    { id: 'permanent', name: 'Permanent', period: 'permanent' },
    { id: 'legal', name: 'Legal Hold', period: 'legal-hold' }
  ],
  redactionLevels: [
    { id: 'none', name: 'None', description: 'No redaction applied' },
    { id: 'partial', name: 'Partial', description: 'Partial data masking' },
    { id: 'full', name: 'Full', description: 'Complete data redaction' },
    { id: 'k-anonymity', name: 'K-Anonymity', description: 'K-anonymity privacy protection' },
    { id: 'differential', name: 'Differential Privacy', description: 'Differential privacy protection' }
  ],
  piiTypes: [
    { id: 'email', name: 'Email', pattern: '\\S+@\\S+\\.\\S+' },
    { id: 'phone', name: 'Phone', pattern: '\\+?[1-9]\\d{1,14}' },
    { id: 'ssn', name: 'SSN', pattern: '\\d{3}-\\d{2}-\\d{4}' },
    { id: 'credit-card', name: 'Credit Card', pattern: '\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}' },
    { id: 'ip-address', name: 'IP Address', pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}' }
  ]
};

interface PrivacyTestRequest {
  dataType: string;
  purpose: string;
  retention: string;
  sampleData?: string;
}

export const PrivacyPolicyPanel: React.FC = () => {
  const { tenant } = useTenant();
  const [testRequest, setTestRequest] = useState<PrivacyTestRequest>({
    dataType: 'personal_data',
    purpose: 'data_processing',
    retention: 'SHORT_30D'
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [testDialog, setTestDialog] = useState(false);
  const [sampleData, setSampleData] = useState('');
  const [piiResults, setPiiResults] = useState<any[]>([]);

  // Test privacy policy evaluation
  const [evaluatePrivacyPolicy, { loading: evaluating }] = useMutation(EVALUATE_PRIVACY_POLICY);

  // Handle privacy policy test
  const handleTestPrivacyPolicy = async () => {
    try {
      const { data } = await evaluatePrivacyPolicy({
        variables: {
          input: {
            tenantId: tenant?.id,
            dataType: testRequest.dataType,
            purpose: testRequest.purpose,
            retention: testRequest.retention,
            context: {
              sampleData: sampleData || undefined
            }
          }
        }
      });

      setTestResult(data.evaluatePrivacyPolicy);

      if (data.evaluatePrivacyPolicy.piiDetected) {
        setPiiResults(data.evaluatePrivacyPolicy.piiDetected);
      }

      logger.info('Privacy policy evaluation completed', data.evaluatePrivacyPolicy);

    } catch (error) {
      logger.error('Privacy policy evaluation failed', error);
      setTestResult({
        allowed: false,
        reason: error.message
      });
    }
  };

  // Handle sample data analysis for PII
  const handlePIIAnalysis = () => {
    if (!sampleData) return;

    const detected: any[] = [];

    mockPrivacySettings.piiTypes.forEach(piiType => {
      const regex = new RegExp(piiType.pattern, 'gi');
      const matches = sampleData.match(regex);

      if (matches) {
        matches.forEach(match => {
          detected.push({
            type: piiType.id.toUpperCase(),
            field: 'sample_data',
            confidence: 0.95,
            location: sampleData.indexOf(match),
            pattern: piiType.pattern,
            value: match
          });
        });
      }
    });

    setPiiResults(detected);
  };

  // Get severity color for PII detection confidence
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'error';
    if (confidence >= 0.7) return 'warning';
    return 'info';
  };

  // Get redaction preview
  const getRedactionPreview = (text: string, level: string) => {
    if (!text) return '';

    switch (level) {
      case 'none':
        return text;
      case 'partial':
        return text.replace(/(.{3}).+(.{3})/, '$1***$2');
      case 'full':
        return '*'.repeat(text.length);
      case 'k-anonymity':
        return `[REDACTED-${Math.floor(Math.random() * 1000)}]`;
      case 'differential':
        return `[PRIVATE-${Math.floor(Math.random() * 1000)}]`;
      default:
        return text;
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon />
        Privacy Policy Management
      </Typography>

      <Grid container spacing={3}>
        {/* Privacy Policy Tester */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Privacy Policy Evaluation
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Data Type</InputLabel>
                  <Select
                    value={testRequest.dataType}
                    onChange={(e) => setTestRequest({ ...testRequest, dataType: e.target.value })}
                  >
                    <MenuItem value="personal_data">Personal Data</MenuItem>
                    <MenuItem value="business_data">Business Data</MenuItem>
                    <MenuItem value="document_data">Document Data</MenuItem>
                    <MenuItem value="analytics_data">Analytics Data</MenuItem>
                    <MenuItem value="general_data">General Data</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Purpose</InputLabel>
                  <Select
                    value={testRequest.purpose}
                    onChange={(e) => setTestRequest({ ...testRequest, purpose: e.target.value })}
                  >
                    <MenuItem value="data_processing">Data Processing</MenuItem>
                    <MenuItem value="data_access">Data Access</MenuItem>
                    <MenuItem value="data_deletion">Data Deletion</MenuItem>
                    <MenuItem value="data_export">Data Export</MenuItem>
                    <MenuItem value="analytics">Analytics</MenuItem>
                    <MenuItem value="general_processing">General Processing</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Retention Tier</InputLabel>
                  <Select
                    value={testRequest.retention}
                    onChange={(e) => setTestRequest({ ...testRequest, retention: e.target.value })}
                  >
                    <MenuItem value="SHORT_30D">Short (30 days)</MenuItem>
                    <MenuItem value="MEDIUM_1Y">Medium (1 year)</MenuItem>
                    <MenuItem value="LONG_7Y">Long (7 years)</MenuItem>
                    <MenuItem value="PERMANENT">Permanent</MenuItem>
                    <MenuItem value="LEGAL_HOLD">Legal Hold</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Sample Data (Optional)"
                  value={sampleData}
                  onChange={(e) => setSampleData(e.target.value)}
                  placeholder="Enter sample data to test PII detection..."
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleTestPrivacyPolicy}
                    disabled={evaluating}
                    startIcon={<SecurityIcon />}
                  >
                    {evaluating ? 'Evaluating...' : 'Test Policy'}
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={handlePIIAnalysis}
                    disabled={!sampleData}
                    startIcon={<VisibilityIcon />}
                  >
                    Analyze PII
                  </Button>
                </Box>
              </Box>

              {evaluating && <LinearProgress sx={{ mt: 2 }} />}

              {/* Test Results */}
              {testResult && (
                <Box sx={{ mt: 3 }}>
                  <Alert severity={testResult.allowed ? 'success' : 'error'} sx={{ mb: 2 }}>
                    Privacy Policy: {testResult.allowed ? 'ALLOWED' : 'DENIED'}
                  </Alert>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Data Classification</Typography>
                      <Chip
                        size="small"
                        label={testResult.dataClassification}
                        color="primary"
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Retention Tier</Typography>
                      <Chip
                        size="small"
                        label={testResult.retentionTier}
                        color="secondary"
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Redaction Level</Typography>
                      <Chip
                        size="small"
                        label={testResult.redactionLevel}
                        color="info"
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Consent Required</Typography>
                      <Chip
                        size="small"
                        label={testResult.consentRequired ? 'YES' : 'NO'}
                        color={testResult.consentRequired ? 'warning' : 'success'}
                      />
                    </Grid>
                  </Grid>

                  {testResult.geoRestrictions?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Geographic Restrictions
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {testResult.geoRestrictions.map((country: string, index: number) => (
                          <Chip key={index} size="small" label={country} color="warning" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* PII Detection Results */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                PII Detection Results
              </Typography>

              {piiResults.length === 0 ? (
                <Alert severity="info">
                  No PII detected in sample data. Enter sample data and click "Analyze PII" to test detection.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Location</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {piiResults.map((pii, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip
                              size="small"
                              label={pii.type}
                              color={getConfidenceColor(pii.confidence) as any}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {pii.value || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {(pii.confidence * 100).toFixed(1)}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {pii.location}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Redaction Preview */}
              {sampleData && testResult?.redactionLevel && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Redaction Preview ({testResult.redactionLevel})
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {getRedactionPreview(sampleData, testResult.redactionLevel.toLowerCase())}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Privacy Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Privacy Configuration
              </Typography>

              <Grid container spacing={2}>
                {/* Data Classifications */}
                <Grid item xs={12} md={4}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Data Classifications</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {mockPrivacySettings.dataClassifications.map((classification) => (
                          <Box key={classification.id} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {classification.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {classification.description}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Retention Tiers */}
                <Grid item xs={12} md={4}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Retention Tiers</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {mockPrivacySettings.retentionTiers.map((tier) => (
                          <Box key={tier.id} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {tier.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Period: {tier.period}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Redaction Levels */}
                <Grid item xs={12} md={4}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1">Redaction Levels</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {mockPrivacySettings.redactionLevels.map((level) => (
                          <Box key={level.id} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {level.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {level.description}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};