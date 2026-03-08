"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectCurrentStep = exports.selectValidation = exports.selectSchemaMapping = exports.selectDataSource = exports.ingestWizardReducer = exports.resetWizard = exports.setValidation = exports.updateSchemaMapping = exports.removeFieldMapping = exports.addFieldMapping = exports.updateDataSource = exports.setCurrentStep = exports.initialWizardState = exports.createEmptyValidation = exports.createEmptyMapping = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const createEmptyMapping = () => ({
    sourceSample: [],
    targetSchema: [],
    mappings: [],
    autoMappedFields: []
});
exports.createEmptyMapping = createEmptyMapping;
const createEmptyValidation = () => ({
    status: 'idle',
    issues: []
});
exports.createEmptyValidation = createEmptyValidation;
exports.initialWizardState = {
    currentStep: 0,
    dataSource: {
        source_config: {},
        geographic_restrictions: [],
        retention_period: 30,
        tos_accepted: false
    },
    schemaMapping: (0, exports.createEmptyMapping)(),
    validation: (0, exports.createEmptyValidation)()
};
const mergeDataSource = (existing, incoming) => ({
    ...existing,
    ...incoming,
    geographic_restrictions: incoming.geographic_restrictions ?? existing.geographic_restrictions ?? [],
    source_config: {
        ...(existing.source_config || {}),
        ...(incoming.source_config || {})
    }
});
const replaceMapping = (_current, next) => ({
    ...next,
    sourceSample: [...next.sourceSample],
    targetSchema: [...next.targetSchema],
    mappings: next.mappings.map((mapping) => ({ ...mapping }))
});
const ingestWizardSlice = (0, toolkit_1.createSlice)({
    name: 'ingestWizard',
    initialState: exports.initialWizardState,
    reducers: {
        setCurrentStep(state, action) {
            state.currentStep = action.payload;
        },
        updateDataSource(state, action) {
            state.dataSource = mergeDataSource(state.dataSource, action.payload);
        },
        addFieldMapping(state, action) {
            const existingIndex = state.schemaMapping.mappings.findIndex((mapping) => mapping.id === action.payload.id);
            if (existingIndex >= 0) {
                state.schemaMapping.mappings[existingIndex] = action.payload;
            }
            else {
                state.schemaMapping.mappings.push(action.payload);
            }
        },
        removeFieldMapping(state, action) {
            state.schemaMapping.mappings = state.schemaMapping.mappings.filter((mapping) => mapping.id !== action.payload);
        },
        updateSchemaMapping(state, action) {
            state.schemaMapping = replaceMapping(state.schemaMapping, action.payload);
        },
        setValidation(state, action) {
            state.validation = { ...action.payload, issues: [...action.payload.issues] };
        },
        resetWizard() {
            return exports.initialWizardState;
        }
    }
});
_a = ingestWizardSlice.actions, exports.setCurrentStep = _a.setCurrentStep, exports.updateDataSource = _a.updateDataSource, exports.addFieldMapping = _a.addFieldMapping, exports.removeFieldMapping = _a.removeFieldMapping, exports.updateSchemaMapping = _a.updateSchemaMapping, exports.setValidation = _a.setValidation, exports.resetWizard = _a.resetWizard;
exports.ingestWizardReducer = ingestWizardSlice.reducer;
const selectDataSource = (state) => state.dataSource;
exports.selectDataSource = selectDataSource;
const selectSchemaMapping = (state) => state.schemaMapping;
exports.selectSchemaMapping = selectSchemaMapping;
const selectValidation = (state) => state.validation;
exports.selectValidation = selectValidation;
const selectCurrentStep = (state) => state.currentStep;
exports.selectCurrentStep = selectCurrentStep;
