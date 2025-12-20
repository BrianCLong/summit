import { Dispatch, useCallback, useMemo, useReducer } from 'react';
import DataSourceSelection from './components/DataSourceSelection';
import SchemaMappingStep from './components/SchemaMappingStep';
import ValidationStep from './components/ValidationStep';
import {
  IngestWizardAction,
  ingestWizardReducer,
  initialWizardState,
  setCurrentStep,
  setValidation,
  updateDataSource,
  updateSchemaMapping
} from './state';
import {
  DataSourceConfig,
  IngestWizardState,
  SchemaMappingState,
  ValidationIssue,
  WizardCompletion
} from './types';
import './styles.css';

export interface IngestWizardProps {
  state?: IngestWizardState;
  dispatch?: Dispatch<IngestWizardAction>;
  onComplete?: (result: WizardCompletion) => void;
  onCancel?: () => void;
  autoValidate?: boolean;
}

const WIZARD_STEPS = ['Data source', 'Schema mapping', 'Validation'];

const performLocalValidation = (
  dataSource: Partial<DataSourceConfig>,
  mapping: SchemaMappingState
) => {
  const issues: ValidationIssue[] = [];

  if (!dataSource.name) {
    issues.push({
      id: 'name',
      severity: 'error',
      message: 'Provide a descriptive data source name before activating the connector.'
    });
  }

  if (!dataSource.source_type) {
    issues.push({
      id: 'source-type',
      severity: 'error',
      message: 'Choose a connector type so that the orchestrator can load the correct adapter.'
    });
  }

  if (!dataSource.tos_accepted) {
    issues.push({
      id: 'tos',
      severity: 'warning',
      message: 'Accept the ingestion terms to document provider approval.'
    });
  }

  if (mapping.mappings.length === 0) {
    issues.push({
      id: 'mapping-empty',
      severity: 'error',
      message: 'Map at least one source column to the canonical schema before continuing.'
    });
  }

  return issues;
};

export const IngestWizard = ({
  state: externalState,
  dispatch: externalDispatch,
  onComplete,
  onCancel,
  autoValidate = true
}: IngestWizardProps) => {
  const [localState, localDispatch] = useReducer(ingestWizardReducer, initialWizardState);
  const state = externalState ?? localState;
  const dispatch = externalDispatch ?? localDispatch;

  const stepLabel = useMemo(() => WIZARD_STEPS[state.currentStep] ?? 'Data source', [state.currentStep]);

  const goToStep = useCallback(
    (step: number) => dispatch(setCurrentStep(Math.min(Math.max(step, 0), WIZARD_STEPS.length - 1))),
    [dispatch]
  );

  const handleDataSourceChange = useCallback(
    (config: Partial<DataSourceConfig>) => dispatch(updateDataSource(config)),
    [dispatch]
  );

  const handleSchemaChange = useCallback(
    (mapping: SchemaMappingState) => dispatch(updateSchemaMapping(mapping)),
    [dispatch]
  );

  const runValidation = useCallback(() => {
    const issues = performLocalValidation(state.dataSource, state.schemaMapping);
    dispatch(
      setValidation({
        status: issues.some((issue) => issue.severity === 'error') ? 'failed' : 'passed',
        issues,
        lastRun: new Date().toISOString()
      })
    );
    return issues;
  }, [dispatch, state.dataSource, state.schemaMapping]);

  const advance = useCallback(() => goToStep(state.currentStep + 1), [goToStep, state.currentStep]);
  const retreat = useCallback(() => goToStep(state.currentStep - 1), [goToStep, state.currentStep]);

  const handleSubmit = useCallback(() => {
    const issues = autoValidate ? runValidation() : state.validation.issues;
    if (issues.some((issue) => issue.severity === 'error')) {
      return;
    }

    if (!state.dataSource.name || !state.dataSource.source_type) {
      return;
    }

    if (!onComplete) {
      return;
    }

    const completion: WizardCompletion = {
      dataSource: state.dataSource as DataSourceConfig,
      schemaMapping: state.schemaMapping,
      validation: {
        ...state.validation,
        issues: issues.length ? issues : state.validation.issues
      }
    };

    onComplete(completion);
  }, [autoValidate, onComplete, runValidation, state.dataSource, state.schemaMapping, state.validation]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div className="iw-wizard-header">
        <div>
          <p>Step {state.currentStep + 1} of {WIZARD_STEPS.length}</p>
          <h1>{stepLabel}</h1>
        </div>

        {onCancel && (
          <button type="button" className="iw-button iw-button-tertiary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {state.currentStep === 0 && (
        <DataSourceSelection value={state.dataSource} onChange={handleDataSourceChange} onNext={advance} />
      )}

      {state.currentStep === 1 && (
        <SchemaMappingStep value={state.schemaMapping} onChange={handleSchemaChange} onBack={retreat} onNext={advance} />
      )}

      {state.currentStep === 2 && (
        <ValidationStep
          dataSource={state.dataSource}
          schemaMapping={state.schemaMapping}
          validation={state.validation}
          onBack={retreat}
          onRunValidation={runValidation}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default IngestWizard;
