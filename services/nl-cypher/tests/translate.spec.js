"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const estimator_js_1 = require("../src/estimator.js");
const executor_js_1 = require("../src/executor.js");
const diff_js_1 = require("../src/diff.js");
const translator_js_1 = require("../src/translator.js");
const validator_js_1 = require("../src/validator.js");
const GOLDEN_PROMPTS = [
    'List all Person nodes',
    'Find person by name',
    'Show person age',
    'People living in a city',
    'Person title search',
    'All companies by industry',
    'Companies in a location',
    'Company name lookup',
    'Projects with status',
    'Projects by budget',
    'Events hosted at company',
    'Events by location',
    'Event date filter',
    'People working at a company',
    'People participating in project',
    'Companies funding projects',
    'Show person city',
    'Find project status done',
    'List project budget big',
    'Find event name',
    'Locate events in city',
    'Company industry filter',
    'Project name search',
    'Event hosted at acme',
    'Who works at acme company',
    'People with title analyst',
    'People older',
    'Project status active',
    'Event date upcoming',
    'Company location nyc',
    'Find company by name',
    'Show projects funded',
    'Participants for project',
    'Show companies funding project',
    'List events hosted by company',
    'Find persons in project',
    'Show city for persons',
    'List all companies',
    'List all events',
    'List all projects',
    'Find person id 10',
    'Project budget filter',
    'Company industry fintech',
    'Event location san francisco',
    'People with title manager',
    'Project status planned',
    'Person age 30',
    'Company location remote',
    'Event hosted at hq',
    'Find company industry health'
];
(0, vitest_1.describe)('nl-cypher translation', () => {
    (0, vitest_1.it)('generates syntactically valid cypher for golden prompts', () => {
        const failures = [];
        GOLDEN_PROMPTS.forEach((prompt) => {
            const result = (0, translator_js_1.translate)(prompt);
            const { valid } = (0, validator_js_1.validateCypher)(result.cypher);
            if (!valid) {
                failures.push(prompt);
            }
            (0, vitest_1.expect)(result.cypher).toMatch(/MATCH \(n:/);
            (0, vitest_1.expect)(result.cypher).toMatch(/RETURN n/);
        });
        (0, vitest_1.expect)(failures.length).toBeLessThanOrEqual(GOLDEN_PROMPTS.length * 0.05);
    });
    (0, vitest_1.it)('provides an accompanying SQL fallback', () => {
        const result = (0, translator_js_1.translate)('List all projects');
        (0, vitest_1.expect)(result.sqlFallback).toBeDefined();
        (0, vitest_1.expect)(result.sqlFallback).toMatch(/select/i);
    });
    (0, vitest_1.it)('estimates cost based on translation', () => {
        const estimateResult = (0, estimator_js_1.estimate)('Projects by status');
        (0, vitest_1.expect)(estimateResult.estimatedRows).toBeGreaterThan(0);
        (0, vitest_1.expect)(estimateResult.estimatedCost).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('executes sandbox run with row caps', () => {
        const result = (0, executor_js_1.sandboxRun)('List people with name filter');
        (0, vitest_1.expect)(result.previewRows.length).toBeLessThanOrEqual(20);
        (0, vitest_1.expect)(typeof result.truncated).toBe('boolean');
    });
    (0, vitest_1.it)('can diff sanitized queries', () => {
        const translation = (0, translator_js_1.translate)('List all people');
        const diff = (0, diff_js_1.diffQueries)(translation.cypher, translation.cypher);
        (0, vitest_1.expect)(diff.every((line) => line.type === 'unchanged')).toBe(true);
    });
});
