import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Step,
  StepButton,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ReplayIcon from '@mui/icons-material/Replay';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useMutation, useQuery } from '@apollo/client';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  hydrateProgress,
  resetLocal,
  setCurrentStep,
  setError,
  setLoading,
  type OnboardingStep,
} from '../../store/slices/onboardingSlice';
import {
  ONBOARDING_PROGRESS,
  RESET_ONBOARDING_PROGRESS,
  UPSERT_ONBOARDING_STEP,
} from '../../graphql/onboarding.gql.js';

const STEP_FIELD_CONFIG: Record<
  string,
  Array<
    {
      name: string;
      label: string;
      type?: 'text' | 'textarea' | 'select';
      placeholder?: string;
      helperText?: string;
      options?: Array<{ label: string; value: string }>;
    }
  >
> = {
  'connect-data': [
    {
      name: 'sourceType',
      label: 'Source Type',
      type: 'select',
      options: [
        { label: 'PostgreSQL', value: 'postgres' },
        { label: 'Snowflake', value: 'snowflake' },
        { label: 'Kafka Topic', value: 'kafka' },
        { label: 'REST API', value: 'rest' },
      ],
    },
    {
      name: 'connectionUri',
      label: 'Connection URI',
      placeholder: 'postgresql://user:pass@host:5432/database',
      helperText: 'Use a read-only credential; secrets are stored in Vault in production.',
    },
  ],
  'map-entities': [
    {
      name: 'entityModel',
      label: 'Entity Model Template',
      type: 'select',
      options: [
        { label: 'Threat Intelligence', value: 'threat-intel' },
        { label: 'Supply Chain', value: 'supply-chain' },
        { label: 'Financial Crimes', value: 'financial-crimes' },
        { label: 'Custom Schema', value: 'custom' },
      ],
    },
    {
      name: 'fieldMappings',
      label: 'Field → Property Mappings',
      type: 'textarea',
      placeholder: 'source_field -> entity.property',
      helperText: 'Document key mappings, e.g. `acct_id -> Account.externalId`',
    },
  ],
  'create-first-query': [
    {
      name: 'queryName',
      label: 'Saved Query Name',
      placeholder: 'First Ingestion Validation',
    },
    {
      name: 'cypher',
      label: 'Cypher or GraphQL Query',
      type: 'textarea',
      placeholder: 'MATCH (p:Person)-[:CONNECTED_TO]->(c:Company) RETURN p, c LIMIT 25',
      helperText: 'Store parametrized queries so analysts can reuse them.',
    },
  ],
  'share-insights': [
    {
      name: 'audience',
      label: 'Target Audience',
      placeholder: 'Intel Operations, Fusion Center, etc.',
    },
    {
      name: 'deliveryChannel',
      label: 'Delivery Channel',
      type: 'select',
      options: [
        { label: 'Email Digest', value: 'email' },
        { label: 'Slack Notification', value: 'slack' },
        { label: 'PagerDuty On-Call', value: 'pagerduty' },
        { label: 'ServiceNow Ticket', value: 'servicenow' },
      ],
    },
    {
      name: 'notes',
      label: 'Launch Notes',
      type: 'textarea',
      placeholder: 'Share acceptance criteria, dashboards, or alert routing.',
    },
  ],
};

type StepFormState = Record<string, Record<string, string>>;

function getInitialFormState(steps: OnboardingStep[]): StepFormState {
  return steps.reduce<StepFormState>((acc, step) => {
    const entries = STEP_FIELD_CONFIG[step.key] ?? [];
    const data = (step.data as Record<string, string> | null) ?? {};
    acc[step.key] = entries.reduce<Record<string, string>>((fields, field) => {
      fields[field.name] = data[field.name] ?? '';
      return fields;
    }, {});
    return acc;
  }, {});
}

export default function OnboardingWizard() {
  const dispatch = useAppDispatch();
  const { user, loading: authLoading } = useAuth();
  const { steps, currentStepKey, loading, error, lastSyncedAt } = useAppSelector((state) => state.onboarding);
  const [formState, setFormState] = useState<StepFormState>(() => getInitialFormState(steps));

  const userId = user?.id ?? 'demo-user';

  const {
    data,
    loading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery(ONBOARDING_PROGRESS, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });

  const [upsertStep, { loading: mutationLoading }] = useMutation(UPSERT_ONBOARDING_STEP);
  const [resetProgress, { loading: resetLoading }] = useMutation(RESET_ONBOARDING_PROGRESS);

  useEffect(() => {
    dispatch(setLoading(authLoading || queryLoading));
  }, [authLoading, queryLoading, dispatch]);

  useEffect(() => {
    if (queryError) {
      dispatch(setError(queryError.message));
    }
  }, [queryError, dispatch]);

  useEffect(() => {
    if (data?.onboardingProgress) {
      dispatch(hydrateProgress(data.onboardingProgress));
    }
  }, [data, dispatch]);

  useEffect(() => {
    setFormState(getInitialFormState(steps));
  }, [steps]);

  const activeStepIndex = useMemo(() => {
    if (!currentStepKey) {
      return steps.length;
    }
    const index = steps.findIndex((step) => step.key === currentStepKey);
    return index >= 0 ? index : 0;
  }, [steps, currentStepKey]);

  const activeStep = steps[activeStepIndex] ?? steps[steps.length - 1];
  const completedCount = steps.filter((step) => step.completed).length;
  const progressPercent = steps.length === 0 ? 0 : Math.round((completedCount / steps.length) * 100);

  const handleFieldChange = (stepKey: string, fieldName: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [stepKey]: {
        ...(prev[stepKey] ?? {}),
        [fieldName]: value,
      },
    }));
  };

  const persistStep = async (stepKey: string, shouldComplete: boolean) => {
    const payload = {
      input: {
        userId,
        stepKey,
        completed: shouldComplete,
        status: shouldComplete ? 'COMPLETED' : 'IN_PROGRESS',
        data: formState[stepKey] ?? {},
      },
    };

    try {
      const result = await upsertStep({ variables: payload });
      if (result.data?.upsertOnboardingStep) {
        dispatch(hydrateProgress(result.data.upsertOnboardingStep));
      }
    } catch (mutationError) {
      dispatch(setError((mutationError as Error).message));
    }
  };

  const handleReset = async () => {
    try {
      await resetProgress({ variables: { userId } });
      dispatch(resetLocal());
      await refetch();
    } catch (resetError) {
      dispatch(setError((resetError as Error).message));
    }
  };

  const renderField = (stepKey: string, fieldConfig: (typeof STEP_FIELD_CONFIG)['connect-data'][number]) => {
    const value = formState[stepKey]?.[fieldConfig.name] ?? '';

    if (fieldConfig.type === 'select') {
      return (
        <TextField
          key={fieldConfig.name}
          select
          fullWidth
          label={fieldConfig.label}
          value={value}
          onChange={(event) => handleFieldChange(stepKey, fieldConfig.name, event.target.value)}
          helperText={fieldConfig.helperText}
          data-testid={`field-${stepKey}-${fieldConfig.name}`}
        >
          {(fieldConfig.options ?? []).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    return (
      <TextField
        key={fieldConfig.name}
        fullWidth
        multiline={fieldConfig.type === 'textarea'}
        minRows={fieldConfig.type === 'textarea' ? 3 : undefined}
        label={fieldConfig.label}
        value={value}
        placeholder={fieldConfig.placeholder}
        helperText={fieldConfig.helperText}
        onChange={(event) => handleFieldChange(stepKey, fieldConfig.name, event.target.value)}
        data-testid={`field-${stepKey}-${fieldConfig.name}`}
      />
    );
  };

  return (
    <Box data-testid="onboarding-wizard" sx={{ maxWidth: 1200, margin: '0 auto', py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" gutterBottom>
            Welcome to Summit Onboarding
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Follow the guided wizard to connect your first dataset, model entities, and publish actionable insights. Progress is
            saved automatically via GraphQL so you can pause and resume at any time.
          </Typography>
        </Box>

        {(loading || mutationLoading || resetLoading) && <LinearProgress data-testid="onboarding-loading" />}

        {error && (
          <Alert severity="error" data-testid="onboarding-error">
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">Setup Progress</Typography>
                <Chip
                  color={completedCount === steps.length && steps.length > 0 ? 'success' : 'info'}
                  icon={completedCount === steps.length && steps.length > 0 ? <VerifiedIcon /> : <PendingActionsIcon />}
                  label={`${completedCount}/${steps.length} steps complete`}
                  data-testid="onboarding-summary"
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 10, borderRadius: 5 }}
                data-testid="onboarding-progress-bar"
              />
              <Typography variant="caption" color="text.secondary" data-testid="onboarding-progress-percent">
                {progressPercent}% complete{lastSyncedAt ? ` · Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : ''}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stepper activeStep={activeStepIndex} alternativeLabel>
              {steps.map((step) => (
                <Step key={step.key} completed={step.completed} data-testid={`onboarding-step-${step.key}`}>
                  <StepButton onClick={() => dispatch(setCurrentStep(step.key))} data-testid={`step-button-${step.key}`}>
                    {step.title}
                  </StepButton>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {activeStep && (
          <Card data-testid={`onboarding-detail-${activeStep.key}`}>
            <CardContent>
              <Stack spacing={3}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h5" gutterBottom>
                      {activeStep.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {activeStep.description}
                    </Typography>
                  </Box>
                  <Chip
                    color={activeStep.completed ? 'success' : activeStep.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                    icon={activeStep.completed ? <CheckCircleIcon /> : <PendingActionsIcon />}
                    label={activeStep.completed ? 'Completed' : activeStep.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'}
                    data-testid={`step-status-${activeStep.key}`}
                  />
                </Box>

                <Grid container spacing={2}>
                  {(STEP_FIELD_CONFIG[activeStep.key] ?? []).map((field) => (
                    <Grid item xs={12} md={field.type === 'textarea' ? 12 : 6} key={field.name}>
                      {renderField(activeStep.key, field)}
                    </Grid>
                  ))}
                </Grid>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveAltIcon />}
                    onClick={() => persistStep(activeStep.key, false)}
                    disabled={mutationLoading}
                    data-testid={`save-step-${activeStep.key}`}
                  >
                    Save Progress
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => persistStep(activeStep.key, true)}
                    disabled={mutationLoading || activeStep.completed}
                    data-testid={`complete-step-${activeStep.key}`}
                  >
                    Mark Step Complete
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<ReplayIcon />}
                    onClick={handleReset}
                    disabled={resetLoading}
                    data-testid="reset-onboarding"
                  >
                    Restart Wizard
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
