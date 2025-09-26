import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material';
import type { DataSourceConfig, DPIAForm } from '@packages/ingest-wizard/src';
import { IngestWizard } from '@packages/ingest-wizard/src';

interface SubmissionSummary {
  config: DataSourceConfig;
  dpia: DPIAForm;
  completedAt: string;
}

const formatList = (items: string[] = []) =>
  items.length === 0 ? 'None provided' : items.join(', ');

export default function IngestWizardPage(): JSX.Element {
  const [submission, setSubmission] = useState<SubmissionSummary | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const [isWizardActive, setWizardActive] = useState(true);

  const handleReset = useCallback(() => {
    setSubmission(null);
    setWizardActive(true);
    setWizardKey((value) => value + 1);
  }, []);

  const handleComplete = useCallback((config: DataSourceConfig, dpia: DPIAForm) => {
    setSubmission({
      config,
      dpia,
      completedAt: new Date().toISOString(),
    });
    setWizardActive(false);
  }, []);

  const completionAlert = useMemo(() => {
    if (!submission) {
      return (
        <Alert severity="info" role="status" sx={{ mb: 4 }}>
          Follow the guided steps to register a new ingestion pipeline with data protection
          safeguards.
        </Alert>
      );
    }

    return (
      <Alert severity="success" role="status" sx={{ mb: 4 }} data-testid="ingest-success-alert">
        <Stack spacing={1}>
          <Typography variant="subtitle1" component="p">
            Ingestion pipeline registered on {new Date(submission.completedAt).toLocaleString()}.
          </Typography>
          <Typography component="p">
            <strong>Source:</strong> {submission.config.name} ({submission.config.source_type})
          </Typography>
          <Typography component="p">
            <strong>License:</strong> {submission.config.license_template ?? 'Custom'}
          </Typography>
          <Divider flexItem aria-hidden sx={{ my: 1 }} />
          <Typography component="p">
            <strong>PII classification:</strong> {submission.dpia.pii_classification}
          </Typography>
          <Typography component="p">
            <strong>Data categories:</strong> {formatList(submission.dpia.data_categories)}
          </Typography>
          <Typography component="p">
            <strong>Security measures:</strong> {formatList(submission.dpia.security_measures)}
          </Typography>
        </Stack>
      </Alert>
    );
  }, [submission]);

  return (
    <Box sx={{ px: { xs: 2, md: 6 }, py: 4 }}>
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">
          Data Ingestion Control Center
        </Typography>
        <Typography variant="body1" color="text.secondary" component="p">
          Launch the ingestion wizard to capture source configuration and privacy impact
          assessments in a single workflow.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <Button variant="contained" onClick={handleReset} disabled={isWizardActive}>
            Start new ingestion run
          </Button>
          {!isWizardActive && submission && (
            <Typography variant="body2" color="text.secondary" component="p">
              Previous completion recorded for {submission.config.name}.
            </Typography>
          )}
        </Stack>
      </Stack>

      {completionAlert}

      {isWizardActive ? (
        <Box key={wizardKey} data-testid="ingest-wizard-container">
          <IngestWizard onComplete={handleComplete} onCancel={() => setWizardActive(false)} />
        </Box>
      ) : (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Wizard closed. Use "Start new ingestion run" to launch it again.
        </Alert>
      )}
    </Box>
  );
}
