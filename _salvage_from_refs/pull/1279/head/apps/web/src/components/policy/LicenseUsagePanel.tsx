/**
 * License Usage Panel
 *
 * Displays license usage metrics, limits, and enforcement status
 * with real-time monitoring and alerts.
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Button,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useTenant } from '../../hooks/useTenant';

// Mock license data for demonstration
const mockLicenseData = {
  tier: 'PROFESSIONAL',
  usage: {
    apiCalls: { current: 8500, limit: 10000, percentage: 85, period: 'monthly', resetAt: '2024-01-01' },
    dataProcessing: { current: 450, limit: 500, percentage: 90, period: 'monthly', resetAt: '2024-01-01' },
    storage: { current: 75, limit: 100, percentage: 75, period: 'monthly', resetAt: '2024-01-01' },
    users: { current: 18, limit: 25, percentage: 72, period: 'monthly', resetAt: '2024-01-01' },
    exports: { current: 120, limit: 200, percentage: 60, period: 'monthly', resetAt: '2024-01-01' }
  },
  limits: {
    apiCallsPerMonth: 10000,
    dataProcessingGB: 500,
    storageGB: 100,
    maxUsers: 25,
    exportsPerMonth: 200,
    supportLevel: 'Standard',
    features: ['API Access', 'Data Processing', 'Export', 'Standard Support']
  },
  violations: [
    {
      type: 'DATA_LIMIT_EXCEEDED',
      current: 450,
      limit: 500,
      percentage: 90,
      message: 'Data processing approaching limit'
    }
  ]
};

interface LicenseUsageItemProps {
  title: string;
  current: number;
  limit: number;
  percentage: number;
  unit?: string;
  resetAt: string;
}

const LicenseUsageItem: React.FC<LicenseUsageItemProps> = ({
  title,
  current,
  limit,
  percentage,
  unit = '',
  resetAt
}) => {
  const getColor = () => {
    if (percentage >= 90) return 'error';
    if (percentage >= 80) return 'warning';
    return 'primary';
  };

  const getIcon = () => {
    if (percentage >= 90) return <ErrorIcon color="error" />;
    if (percentage >= 80) return <WarningIcon color="warning" />;
    return <CheckIcon color="success" />;
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          {getIcon()}
        </Box>

        <Typography variant="h4" gutterBottom>
          {current.toLocaleString()} {unit}
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          of {limit.toLocaleString()} {unit} ({percentage.toFixed(1)}%)
        </Typography>

        <LinearProgress
          variant="determinate"
          value={percentage}
          color={getColor() as any}
          sx={{ mb: 1 }}
        />

        <Typography variant="caption" color="text.secondary">
          Resets {format(new Date(resetAt), 'PPP')}
        </Typography>
      </CardContent>
    </Card>
  );
};

export const LicenseUsagePanel: React.FC = () => {
  const { tenant } = useTenant();
  const [resetDialog, setResetDialog] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState('');

  const licenseData = mockLicenseData; // In real app, this would come from GraphQL

  const handleResetUsage = () => {
    // Implement reset logic
    console.log('Resetting usage for:', selectedCounter);
    setResetDialog(false);
  };

  const handleExportUsage = () => {
    // Implement export logic
    console.log('Exporting usage data');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon />
          License Usage - {licenseData.tier} Tier
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => setResetDialog(true)}
          >
            Reset Usage
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportUsage}
          >
            Export Data
          </Button>
        </Box>
      </Box>

      {/* License Violations Alert */}
      {licenseData.violations.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            License Usage Warnings
          </Typography>
          {licenseData.violations.map((violation, index) => (
            <Typography key={index} variant="body2">
              {violation.message} ({violation.percentage.toFixed(1)}% used)
            </Typography>
          ))}
        </Alert>
      )}

      {/* Usage Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <LicenseUsageItem
            title="API Calls"
            current={licenseData.usage.apiCalls.current}
            limit={licenseData.usage.apiCalls.limit}
            percentage={licenseData.usage.apiCalls.percentage}
            resetAt={licenseData.usage.apiCalls.resetAt}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <LicenseUsageItem
            title="Data Processing"
            current={licenseData.usage.dataProcessing.current}
            limit={licenseData.usage.dataProcessing.limit}
            percentage={licenseData.usage.dataProcessing.percentage}
            unit="GB"
            resetAt={licenseData.usage.dataProcessing.resetAt}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <LicenseUsageItem
            title="Storage"
            current={licenseData.usage.storage.current}
            limit={licenseData.usage.storage.limit}
            percentage={licenseData.usage.storage.percentage}
            unit="GB"
            resetAt={licenseData.usage.storage.resetAt}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <LicenseUsageItem
            title="Users"
            current={licenseData.usage.users.current}
            limit={licenseData.usage.users.limit}
            percentage={licenseData.usage.users.percentage}
            resetAt={licenseData.usage.users.resetAt}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <LicenseUsageItem
            title="Exports"
            current={licenseData.usage.exports.current}
            limit={licenseData.usage.exports.limit}
            percentage={licenseData.usage.exports.percentage}
            resetAt={licenseData.usage.exports.resetAt}
          />
        </Grid>
      </Grid>

      {/* License Features */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            License Features & Limits
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Included Features
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {licenseData.limits.features.map((feature, index) => (
                  <Chip key={index} label={feature} color="primary" size="small" />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Support Level
              </Typography>
              <Chip label={licenseData.limits.supportLevel} color="secondary" />
            </Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Resource</TableCell>
                  <TableCell align="right">Current</TableCell>
                  <TableCell align="right">Limit</TableCell>
                  <TableCell align="right">Usage</TableCell>
                  <TableCell align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(licenseData.usage).map(([key, usage]) => (
                  <TableRow key={key}>
                    <TableCell>
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </TableCell>
                    <TableCell align="right">{usage.current.toLocaleString()}</TableCell>
                    <TableCell align="right">{usage.limit.toLocaleString()}</TableCell>
                    <TableCell align="right">{usage.percentage.toFixed(1)}%</TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={
                          usage.percentage >= 90 ? 'Critical' :
                          usage.percentage >= 80 ? 'Warning' : 'OK'
                        }
                        color={
                          usage.percentage >= 90 ? 'error' :
                          usage.percentage >= 80 ? 'warning' : 'success'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Reset Usage Dialog */}
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)}>
        <DialogTitle>Reset License Usage</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Select which usage counter to reset. This action cannot be undone.
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Counter</InputLabel>
            <Select
              value={selectedCounter}
              onChange={(e) => setSelectedCounter(e.target.value)}
            >
              <MenuItem value="apiCalls">API Calls</MenuItem>
              <MenuItem value="dataProcessing">Data Processing</MenuItem>
              <MenuItem value="storage">Storage</MenuItem>
              <MenuItem value="users">Users</MenuItem>
              <MenuItem value="exports">Exports</MenuItem>
              <MenuItem value="all">All Counters</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>Cancel</Button>
          <Button onClick={handleResetUsage} color="primary" disabled={!selectedCounter}>
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};