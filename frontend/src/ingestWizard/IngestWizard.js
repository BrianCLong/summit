"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestWizard = void 0;
const react_1 = require("react");
const DataSourceSelection_1 = __importDefault(require("./components/DataSourceSelection"));
const SchemaMappingStep_1 = __importDefault(require("./components/SchemaMappingStep"));
const ValidationStep_1 = __importDefault(require("./components/ValidationStep"));
const state_1 = require("./state");
require("./styles.css");
const WIZARD_STEPS = ['Data source', 'Schema mapping', 'Validation'];
const performLocalValidation = (dataSource, mapping) => {
    const issues = [];
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
const IngestWizard = ({ state: externalState, dispatch: externalDispatch, onComplete, onCancel, autoValidate = true }) => {
    const [localState, localDispatch] = (0, react_1.useReducer)(state_1.ingestWizardReducer, state_1.initialWizardState);
    const state = externalState ?? localState;
    const dispatch = externalDispatch ?? localDispatch;
    const stepLabel = (0, react_1.useMemo)(() => WIZARD_STEPS[state.currentStep] ?? 'Data source', [state.currentStep]);
    const goToStep = (0, react_1.useCallback)((step) => dispatch((0, state_1.setCurrentStep)(Math.min(Math.max(step, 0), WIZARD_STEPS.length - 1))), [dispatch]);
    const handleDataSourceChange = (0, react_1.useCallback)((config) => dispatch((0, state_1.updateDataSource)(config)), [dispatch]);
    const handleSchemaChange = (0, react_1.useCallback)((mapping) => dispatch((0, state_1.updateSchemaMapping)(mapping)), [dispatch]);
    const runValidation = (0, react_1.useCallback)(() => {
        const issues = performLocalValidation(state.dataSource, state.schemaMapping);
        dispatch((0, state_1.setValidation)({
            status: issues.some((issue) => issue.severity === 'error') ? 'failed' : 'passed',
            issues,
            lastRun: new Date().toISOString()
        }));
        return issues;
    }, [dispatch, state.dataSource, state.schemaMapping]);
    const advance = (0, react_1.useCallback)(() => goToStep(state.currentStep + 1), [goToStep, state.currentStep]);
    const retreat = (0, react_1.useCallback)(() => goToStep(state.currentStep - 1), [goToStep, state.currentStep]);
    const handleSubmit = (0, react_1.useCallback)(() => {
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
        const completion = {
            dataSource: state.dataSource,
            schemaMapping: state.schemaMapping,
            validation: {
                ...state.validation,
                issues: issues.length ? issues : state.validation.issues
            }
        };
        onComplete(completion);
    }, [autoValidate, onComplete, runValidation, state.dataSource, state.schemaMapping, state.validation]);
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div className="iw-wizard-header">
        <div>
          <p>Step {state.currentStep + 1} of {WIZARD_STEPS.length}</p>
          <h1>{stepLabel}</h1>
        </div>

        {onCancel && (<button type="button" className="iw-button iw-button-tertiary" onClick={onCancel}>
            Cancel
          </button>)}
      </div>

      {state.currentStep === 0 && (<DataSourceSelection_1.default value={state.dataSource} onChange={handleDataSourceChange} onNext={advance}/>)}

      {state.currentStep === 1 && (<SchemaMappingStep_1.default value={state.schemaMapping} onChange={handleSchemaChange} onBack={retreat} onNext={advance}/>)}

      {state.currentStep === 2 && (<ValidationStep_1.default dataSource={state.dataSource} schemaMapping={state.schemaMapping} validation={state.validation} onBack={retreat} onRunValidation={runValidation} onSubmit={handleSubmit}/>)}
    </div>);
};
exports.IngestWizard = IngestWizard;
exports.default = exports.IngestWizard;
