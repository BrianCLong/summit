import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  DataSourceConfig,
  FieldMapping,
  IngestWizardState,
  SchemaMappingState,
  ValidationState
} from './types';

export const createEmptyMapping = (): SchemaMappingState => ({
  sourceSample: [],
  targetSchema: [],
  mappings: [],
  autoMappedFields: []
});

export const createEmptyValidation = (): ValidationState => ({
  status: 'idle',
  issues: []
});

export const initialWizardState: IngestWizardState = {
  currentStep: 0,
  dataSource: {
    source_config: {},
    geographic_restrictions: [],
    retention_period: 30,
    tos_accepted: false
  },
  schemaMapping: createEmptyMapping(),
  validation: createEmptyValidation()
};

const mergeDataSource = (
  existing: Partial<DataSourceConfig>,
  incoming: Partial<DataSourceConfig>
): Partial<DataSourceConfig> => ({
  ...existing,
  ...incoming,
  geographic_restrictions:
    incoming.geographic_restrictions ?? existing.geographic_restrictions ?? [],
  source_config: {
    ...(existing.source_config || {}),
    ...(incoming.source_config || {})
  }
});

const replaceMapping = (
  _current: SchemaMappingState,
  next: SchemaMappingState
): SchemaMappingState => ({
  ...next,
  sourceSample: [...next.sourceSample],
  targetSchema: [...next.targetSchema],
  mappings: next.mappings.map((mapping) => ({ ...mapping }))
});

const ingestWizardSlice = createSlice({
  name: 'ingestWizard',
  initialState: initialWizardState,
  reducers: {
    setCurrentStep(state, action: PayloadAction<number>) {
      state.currentStep = action.payload;
    },
    updateDataSource(state, action: PayloadAction<Partial<DataSourceConfig>>) {
      state.dataSource = mergeDataSource(state.dataSource, action.payload);
    },
    addFieldMapping(state, action: PayloadAction<FieldMapping>) {
      const existingIndex = state.schemaMapping.mappings.findIndex(
        (mapping) => mapping.id === action.payload.id
      );
      if (existingIndex >= 0) {
        state.schemaMapping.mappings[existingIndex] = action.payload;
      } else {
        state.schemaMapping.mappings.push(action.payload);
      }
    },
    removeFieldMapping(state, action: PayloadAction<string>) {
      state.schemaMapping.mappings = state.schemaMapping.mappings.filter(
        (mapping) => mapping.id !== action.payload
      );
    },
    updateSchemaMapping(state, action: PayloadAction<SchemaMappingState>) {
      state.schemaMapping = replaceMapping(state.schemaMapping, action.payload);
    },
    setValidation(state, action: PayloadAction<ValidationState>) {
      state.validation = { ...action.payload, issues: [...action.payload.issues] };
    },
    resetWizard() {
      return initialWizardState;
    }
  }
});

export const {
  setCurrentStep,
  updateDataSource,
  addFieldMapping,
  removeFieldMapping,
  updateSchemaMapping,
  setValidation,
  resetWizard
} = ingestWizardSlice.actions;

export const ingestWizardReducer = ingestWizardSlice.reducer;

export type IngestWizardAction = ReturnType<
  | typeof setCurrentStep
  | typeof updateDataSource
  | typeof addFieldMapping
  | typeof removeFieldMapping
  | typeof updateSchemaMapping
  | typeof setValidation
  | typeof resetWizard
>;

export const selectDataSource = (state: IngestWizardState) => state.dataSource;
export const selectSchemaMapping = (state: IngestWizardState) => state.schemaMapping;
export const selectValidation = (state: IngestWizardState) => state.validation;
export const selectCurrentStep = (state: IngestWizardState) => state.currentStep;
