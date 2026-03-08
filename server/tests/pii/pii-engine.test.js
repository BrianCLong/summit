"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const index_js_1 = require("../../src/pii/index.js");
const globals_1 = require("@jest/globals");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const loadDataset = () => {
    const datasetPath = node_path_1.default.resolve(__dirname, '../../data/pii/benchmark.json');
    return JSON.parse(node_fs_1.default.readFileSync(datasetPath, 'utf-8'));
};
(0, globals_1.describe)('Semantic PII Mapping Engine', () => {
    (0, globals_1.it)('includes more than 50 PII detection patterns', () => {
        (0, globals_1.expect)(index_js_1.PATTERN_COUNT).toBeGreaterThanOrEqual(50);
    });
    (0, globals_1.it)('recognizes structured PII entities with contextual boosts', async () => {
        const recognizer = new index_js_1.HybridEntityRecognizer();
        const result = await recognizer.recognize({
            value: 'Contact Liam via email at liam@example.com or call +1 415 555 1212. Passport: XG4521987',
            schemaField: {
                fieldName: 'passport',
                description: 'Passport number',
                piiHints: ['passportNumber'],
            },
        });
        const types = result.entities.map((entity) => entity.type);
        (0, globals_1.expect)(types).toEqual(globals_1.expect.arrayContaining(['email', 'passportNumber']));
        const passport = result.entities.find((entity) => entity.type === 'passportNumber');
        (0, globals_1.expect)(passport?.confidence).toBeGreaterThan(0.7);
    });
    (0, globals_1.it)('applies taxonomy severity and schema metadata correctly', async () => {
        const recognizer = new index_js_1.HybridEntityRecognizer();
        const taxonomy = new index_js_1.TaxonomyManager();
        const engine = new index_js_1.ClassificationEngine(recognizer, taxonomy);
        const classification = await engine.classify('123-45-6789', {
            value: '123-45-6789',
            schema: {
                name: 'sensitive_records',
                fields: [
                    {
                        fieldName: 'ssn',
                        description: 'Social Security Number',
                        piiHints: ['socialSecurityNumber'],
                        riskLevel: 'critical',
                    },
                ],
            },
            schemaField: {
                fieldName: 'ssn',
                description: 'Social Security Number',
                piiHints: ['socialSecurityNumber'],
                riskLevel: 'critical',
            },
            recordId: 'rec-1',
        });
        (0, globals_1.expect)(classification.entities).toHaveLength(1);
        const entity = classification.entities[0];
        (0, globals_1.expect)(entity.type).toBe('socialSecurityNumber');
        (0, globals_1.expect)(entity.severity).toBe('critical');
        (0, globals_1.expect)(entity.categories).toContain('identity');
        (0, globals_1.expect)(entity.policyTags).toContain('restricted');
    });
    (0, globals_1.it)('supports incremental bulk scanning with change tracking', async () => {
        const dataset = loadDataset();
        const recognizer = new index_js_1.HybridEntityRecognizer();
        const engine = new index_js_1.ClassificationEngine(recognizer, new index_js_1.TaxonomyManager());
        const scanner = new index_js_1.BulkScanner(engine);
        const records = dataset.records.map((record) => ({
            id: record.id,
            tableName: record.table,
            value: record.data,
            schema: record.schema,
            updatedAt: new Date().toISOString(),
        }));
        const firstReport = await scanner.scan(records, {
            incremental: true,
            includeUnchanged: true,
            minimumConfidence: 0.5,
        });
        (0, globals_1.expect)(firstReport.results.length).toBeGreaterThan(0);
        const customer = firstReport.results.find((item) => item.recordId === 'customer-001');
        (0, globals_1.expect)(customer?.detected.find((entity) => entity.type === 'socialSecurityNumber')).toBeDefined();
        const secondReport = await scanner.scan(records, {
            incremental: true,
            includeUnchanged: true,
            minimumConfidence: 0.5,
        });
        (0, globals_1.expect)(secondReport.results.length).toBeGreaterThan(0);
        (0, globals_1.expect)(secondReport.results.every((result) => result.changed === false)).toBe(true);
        const mutatedRecords = records.map((record) => record.id === 'customer-001'
            ? {
                ...record,
                value: { ...record.value, email: 'ava.updated@example.com' },
                updatedAt: new Date(Date.now() + 1000).toISOString(),
            }
            : record);
        const thirdReport = await scanner.scan(mutatedRecords, {
            incremental: true,
            includeUnchanged: true,
            minimumConfidence: 0.5,
        });
        const changed = thirdReport.results.find((result) => result.recordId === 'customer-001');
        (0, globals_1.expect)(changed?.changed).toBe(true);
    });
    (0, globals_1.it)('enqueues low-confidence detections for human verification', async () => {
        const queue = new index_js_1.VerificationQueue({ minimumConfidence: 0.95 });
        const entity = {
            id: 'entity-1',
            type: 'email',
            value: 'example@example.com',
            start: 0,
            end: 5,
            detectors: ['pattern:test'],
            confidence: 0.8,
            rawScore: 0.8,
            severity: 'high',
            taxonomy: 'global-default',
            categories: ['contact'],
            policyTags: ['confidential'],
            context: {
                text: 'example@example.com',
                before: '',
                after: '',
                schemaField: 'email',
            },
        };
        (0, globals_1.expect)(queue.shouldEnqueue(entity)).toBe(true);
        const task = await queue.enqueue(entity);
        (0, globals_1.expect)(task.status).toBe('pending');
        const resolved = await queue.resolve(task.taskId, 'approved', 'qa.user', 'Validated PII match');
        (0, globals_1.expect)(resolved.status).toBe('approved');
        (0, globals_1.expect)(queue.list('approved')).toHaveLength(1);
    });
});
