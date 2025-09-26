import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type OnboardingStepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  completed: boolean;
  data: Record<string, unknown> | null;
  updatedAt: string | null;
  completedAt: string | null;
}

export interface OnboardingProgress {
  userId: string;
  steps: OnboardingStep[];
  currentStepKey: string | null;
  completed: boolean;
  completedAt: string | null;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  currentStepKey: string | null;
  loading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
}

export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'connect-data',
    title: 'Connect Data Sources',
    description: 'Authenticate a connector and configure ingestion cadence so IntelGraph can mirror your source systems.',
    status: 'NOT_STARTED',
    completed: false,
    data: null,
    updatedAt: null,
    completedAt: null,
  },
  {
    key: 'map-entities',
    title: 'Model Entities & Relationships',
    description: 'Define how source fields map into graph entities and relationships for explainable analytics.',
    status: 'NOT_STARTED',
    completed: false,
    data: null,
    updatedAt: null,
    completedAt: null,
  },
  {
    key: 'create-first-query',
    title: 'Create Your First Query',
    description: 'Build and execute a starter query to validate the ingestion and model configuration.',
    status: 'NOT_STARTED',
    completed: false,
    data: null,
    updatedAt: null,
    completedAt: null,
  },
  {
    key: 'share-insights',
    title: 'Share Insights with Stakeholders',
    description: 'Publish dashboards or alerts so downstream teams can operationalize the findings.',
    status: 'NOT_STARTED',
    completed: false,
    data: null,
    updatedAt: null,
    completedAt: null,
  },
];

const initialState: OnboardingState = {
  steps: DEFAULT_ONBOARDING_STEPS.map((step) => ({ ...step })),
  currentStepKey: DEFAULT_ONBOARDING_STEPS[0]?.key ?? null,
  loading: false,
  error: null,
  lastSyncedAt: null,
};

function mergeSteps(base: OnboardingStep[], incoming: OnboardingStep[]): OnboardingStep[] {
  const incomingMap = new Map(incoming.map((step) => [step.key, step]));
  return base.map((step) => {
    const override = incomingMap.get(step.key);
    if (!override) {
      return { ...step };
    }
    return {
      ...step,
      ...override,
      data: override.data ?? null,
      updatedAt: override.updatedAt ?? step.updatedAt,
      completedAt: override.completedAt ?? step.completedAt,
    };
  });
}

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setCurrentStep(state, action: PayloadAction<string | null>) {
      state.currentStepKey = action.payload;
    },
    hydrateProgress(state, action: PayloadAction<OnboardingProgress>) {
      const merged = mergeSteps(DEFAULT_ONBOARDING_STEPS, action.payload.steps ?? []);
      state.steps = merged;
      state.currentStepKey =
        action.payload.currentStepKey || merged.find((step) => !step.completed)?.key || merged[merged.length - 1]?.key || null;
      state.loading = false;
      state.error = null;
      state.lastSyncedAt = new Date().toISOString();
    },
    resetLocal(state) {
      state.steps = DEFAULT_ONBOARDING_STEPS.map((step) => ({ ...step }));
      state.currentStepKey = DEFAULT_ONBOARDING_STEPS[0]?.key ?? null;
      state.loading = false;
      state.error = null;
      state.lastSyncedAt = null;
    },
  },
});

export const { setLoading, setError, setCurrentStep, hydrateProgress, resetLocal } = onboardingSlice.actions;

export default onboardingSlice.reducer;
