"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithWarnings = exports.NoIssues = void 0;
const ValidationStep_1 = __importDefault(require("../components/ValidationStep"));
const schemaMapping = {
    sourceSample: [],
    targetSchema: [],
    mappings: [
        { id: '1', sourceField: 'full_name', targetField: 'person_name', required: true },
        { id: '2', sourceField: 'email', targetField: 'contact_email' }
    ],
    autoMappedFields: []
};
const meta = {
    title: 'Ingest Wizard/ValidationStep',
    component: ValidationStep_1.default,
    parameters: {
        layout: 'centered'
    }
};
exports.default = meta;
exports.NoIssues = {
    args: {
        dataSource: {
            name: 'Sanctions feed',
            source_type: 'csv',
            retention_period: 90,
            tos_accepted: true
        },
        schemaMapping,
        validation: {
            status: 'passed',
            issues: [],
            lastRun: new Date().toISOString()
        }
    }
};
exports.WithWarnings = {
    args: {
        dataSource: {
            name: 'OSINT stream',
            source_type: 'api',
            retention_period: 45,
            tos_accepted: false
        },
        schemaMapping,
        validation: {
            status: 'failed',
            issues: [
                {
                    id: 'tos',
                    severity: 'warning',
                    message: 'Terms of service acknowledgement is missing.',
                    suggestion: 'Review provider agreement and check the acknowledgement box.'
                },
                {
                    id: 'mapping-empty',
                    severity: 'error',
                    message: 'At least one mandatory canonical field is not mapped.'
                }
            ],
            lastRun: new Date().toISOString()
        }
    }
};
