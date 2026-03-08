"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const react_1 = require("react");
const IngestWizard_1 = __importDefault(require("../IngestWizard"));
const state_1 = require("../state");
const meta = {
    title: 'Ingest Wizard/Wizard',
    component: IngestWizard_1.default,
    parameters: {
        layout: 'fullscreen'
    }
};
exports.default = meta;
exports.Default = {
    render: () => {
        const [state, dispatch] = (0, react_1.useReducer)(state_1.ingestWizardReducer, state_1.initialWizardState, () => ({
            ...state_1.initialWizardState,
            schemaMapping: {
                sourceSample: [
                    { name: 'full_name', type: 'string' },
                    { name: 'email', type: 'string' }
                ],
                targetSchema: [
                    { name: 'person_name', type: 'string', required: true },
                    { name: 'contact_email', type: 'string' }
                ],
                mappings: [],
                autoMappedFields: []
            }
        }));
        return (<div className="mx-auto max-w-4xl p-6">
        <IngestWizard_1.default state={state} dispatch={dispatch} onComplete={(result) => console.log('Complete', result)}/>
      </div>);
    }
};
