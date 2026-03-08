"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ObligationTrackerService_js_1 = require("./ObligationTrackerService.js");
(0, globals_1.describe)('ObligationTrackerService', () => {
    const baseClause = {
        id: 'clause-1',
        title: 'Timely data deletion',
        description: 'Delete data within 24 hours of request',
        rule: {
            kind: 'task',
            taskId: 'data-deletion',
            name: 'Purge user record',
            frequency: { type: 'once', at: '2024-01-01T00:00:00.000Z' },
            slaHours: 24,
            evidence: [
                {
                    id: 'deletion-log',
                    description: 'System log showing deletion completion',
                },
            ],
            escalations: [
                { id: 'compliance', afterHours: 24, contact: 'compliance@example.com' },
            ],
        },
    };
    (0, globals_1.it)('compiles clauses into deterministic scheduled tasks', () => {
        const serviceA = new ObligationTrackerService_js_1.ObligationTrackerService(() => new Date('2023-12-31T00:00:00.000Z'));
        const serviceB = new ObligationTrackerService_js_1.ObligationTrackerService(() => new Date('2023-12-31T00:00:00.000Z'));
        const compiledA = serviceA.compileClauses([baseClause]);
        const compiledB = serviceB.compileClauses([baseClause]);
        (0, globals_1.expect)(compiledA).toEqual(compiledB);
        (0, globals_1.expect)(compiledA).toHaveLength(1);
        (0, globals_1.expect)(compiledA[0]).toMatchObject({
            clauseId: 'clause-1',
            name: 'Purge user record',
            dueAt: '2024-01-02T00:00:00.000Z',
        });
    });
    (0, globals_1.it)('emits escalations for overdue tasks', () => {
        const service = new ObligationTrackerService_js_1.ObligationTrackerService(() => new Date('2024-01-05T00:00:00.000Z'));
        const clause = {
            ...baseClause,
            rule: {
                kind: 'task',
                taskId: 'access-review',
                name: 'Perform quarterly access review',
                frequency: { type: 'once', at: '2023-12-01T00:00:00.000Z' },
                slaHours: 48,
                evidence: [
                    {
                        id: 'access-review-report',
                        description: 'Certification report signed by compliance lead',
                    },
                ],
                escalations: [
                    { id: 'manager', afterHours: 12, contact: 'manager@example.com' },
                    { id: 'director', afterHours: 36, contact: 'director@example.com' },
                ],
            },
        };
        const [task] = service.compileClauses([clause]);
        (0, globals_1.expect)(task.status).toBe('pending');
        const escalations = service.checkForEscalations(new Date('2024-01-05T00:00:00.000Z'));
        (0, globals_1.expect)(escalations).toHaveLength(2);
        (0, globals_1.expect)(escalations.map((e) => e.level.id)).toEqual(['manager', 'director']);
        (0, globals_1.expect)(escalations.every((e) => e.taskId === task.id)).toBe(true);
        const updatedTask = service.exportProofPack('clause-1').clauses[0].tasks[0];
        (0, globals_1.expect)(updatedTask.status).toBe('overdue');
    });
    (0, globals_1.it)('exports proof packs that validate evidence completeness', () => {
        const service = new ObligationTrackerService_js_1.ObligationTrackerService(() => new Date('2024-01-02T12:00:00.000Z'));
        const [task] = service.compileClauses([baseClause]);
        const payload = {
            taskId: task.id,
            requirementId: 'deletion-log',
            evidenceId: 'log-123',
            location: 's3://evidence/log-123.json',
            submittedAt: '2024-01-01T18:00:00.000Z',
            submittedBy: 'automation@system',
        };
        const result = service.ingestEvidence(payload);
        (0, globals_1.expect)(result.accepted).toBe(true);
        (0, globals_1.expect)(result.complete).toBe(true);
        (0, globals_1.expect)(result.taskStatus).toBe('completed');
        const pack = service.exportProofPack();
        (0, globals_1.expect)(pack.complete).toBe(true);
        (0, globals_1.expect)(pack.clauses[0].complete).toBe(true);
        (0, globals_1.expect)(pack.clauses[0].tasks[0].evidence[0]).toMatchObject({
            provided: true,
            records: [
                globals_1.expect.objectContaining({
                    evidenceId: 'log-123',
                    location: 's3://evidence/log-123.json',
                }),
            ],
        });
    });
});
