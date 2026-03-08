"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithMappings = exports.Empty = void 0;
const react_1 = require("react");
const SchemaMappingStep_1 = __importDefault(require("../components/SchemaMappingStep"));
const baseState = {
    sourceSample: [
        { name: 'full_name', type: 'string', example: 'Jane Doe' },
        { name: 'email', type: 'string', example: 'jane@example.com' },
        { name: 'country', type: 'string', example: 'US' }
    ],
    targetSchema: [
        { name: 'person_name', type: 'string', required: true },
        { name: 'contact_email', type: 'string' },
        { name: 'residency', type: 'string' }
    ],
    mappings: [],
    autoMappedFields: ['full_name']
};
const meta = {
    title: 'Ingest Wizard/SchemaMappingStep',
    component: SchemaMappingStep_1.default,
    parameters: {
        layout: 'centered'
    }
};
exports.default = meta;
exports.Empty = {
    render: () => {
        const [value, setValue] = (0, react_1.useState)(baseState);
        return <SchemaMappingStep_1.default value={value} onChange={setValue}/>;
    }
};
exports.WithMappings = {
    render: () => {
        const [value, setValue] = (0, react_1.useState)({
            ...baseState,
            mappings: [
                { id: '1', sourceField: 'full_name', targetField: 'person_name', required: true },
                { id: '2', sourceField: 'email', targetField: 'contact_email' }
            ]
        });
        return <SchemaMappingStep_1.default value={value} onChange={setValue}/>;
    }
};
