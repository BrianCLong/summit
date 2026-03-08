import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { CohortEvaluator } from '../CohortEvaluator.js';
import { Cohort } from '../types.js';

const TEST_LOG_DIR = path.join(__dirname, 'test_logs_cohorts_' + Date.now());

describe('CohortEvaluator', () => {
    let evaluator: CohortEvaluator;

    beforeEach(() => {
        if (fs.existsSync(TEST_LOG_DIR)) {
            fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
        evaluator = new CohortEvaluator(TEST_LOG_DIR);
    });

    afterEach(() => {
        if (fs.existsSync(TEST_LOG_DIR)) {
             try { fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true }); } catch (e: any) {}
        }
    });

    it('should identify members matching criteria', () => {
        // Seed some data
        const events = [
            { eventType: 'login', tenantIdHash: 't1', scopeHash: 'u1', ts: new Date().toISOString() },
            { eventType: 'login', tenantIdHash: 't1', scopeHash: 'u1', ts: new Date().toISOString() },
            { eventType: 'login', tenantIdHash: 't2', scopeHash: 'u2', ts: new Date().toISOString() }, // Only 1 login
            { eventType: 'search', tenantIdHash: 't1', scopeHash: 'u1', ts: new Date().toISOString() },
        ];

        fs.writeFileSync(path.join(TEST_LOG_DIR, 'telemetry-test.jsonl'), events.map(e => JSON.stringify(e)).join('\n'));

        const cohort: Cohort = {
            id: 'heavy-users',
            name: 'Heavy Users',
            windowDays: 7,
            criteria: {
                eventType: 'login',
                metric: 'count',
                operator: 'gt',
                value: 1 // Must have > 1 logins
            }
        };

        const result = evaluator.evaluate(cohort);
        expect(result.members.length).toBe(1);
        expect(result.members[0].hashedUserId).toBe('u1');
        expect(result.members[0].metricValue).toBe(2);
    });
});
