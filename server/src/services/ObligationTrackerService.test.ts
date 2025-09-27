import {
  ObligationTrackerService,
  ObligationClause,
  EvidenceWebhookPayload,
} from './ObligationTrackerService';

describe('ObligationTrackerService', () => {
  const baseClause: ObligationClause = {
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

  it('compiles clauses into deterministic scheduled tasks', () => {
    const serviceA = new ObligationTrackerService(() =>
      new Date('2023-12-31T00:00:00.000Z')
    );
    const serviceB = new ObligationTrackerService(() =>
      new Date('2023-12-31T00:00:00.000Z')
    );

    const compiledA = serviceA.compileClauses([baseClause]);
    const compiledB = serviceB.compileClauses([baseClause]);

    expect(compiledA).toEqual(compiledB);
    expect(compiledA).toHaveLength(1);
    expect(compiledA[0]).toMatchObject({
      clauseId: 'clause-1',
      name: 'Purge user record',
      dueAt: '2024-01-02T00:00:00.000Z',
    });
  });

  it('emits escalations for overdue tasks', () => {
    const service = new ObligationTrackerService(() =>
      new Date('2024-01-05T00:00:00.000Z')
    );

    const clause: ObligationClause = {
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
    expect(task.status).toBe('pending');

    const escalations = service.checkForEscalations(new Date('2024-01-05T00:00:00.000Z'));

    expect(escalations).toHaveLength(2);
    expect(escalations.map((e) => e.level.id)).toEqual(['manager', 'director']);
    expect(escalations.every((e) => e.taskId === task.id)).toBe(true);

    const updatedTask = service.exportProofPack('clause-1').clauses[0].tasks[0];
    expect(updatedTask.status).toBe('overdue');
  });

  it('exports proof packs that validate evidence completeness', () => {
    const service = new ObligationTrackerService(() =>
      new Date('2024-01-02T12:00:00.000Z')
    );
    const [task] = service.compileClauses([baseClause]);

    const payload: EvidenceWebhookPayload = {
      taskId: task.id,
      requirementId: 'deletion-log',
      evidenceId: 'log-123',
      location: 's3://evidence/log-123.json',
      submittedAt: '2024-01-01T18:00:00.000Z',
      submittedBy: 'automation@system',
    };

    const result = service.ingestEvidence(payload);
    expect(result.accepted).toBe(true);
    expect(result.complete).toBe(true);
    expect(result.taskStatus).toBe('completed');

    const pack = service.exportProofPack();
    expect(pack.complete).toBe(true);
    expect(pack.clauses[0].complete).toBe(true);
    expect(pack.clauses[0].tasks[0].evidence[0]).toMatchObject({
      provided: true,
      records: [
        expect.objectContaining({
          evidenceId: 'log-123',
          location: 's3://evidence/log-123.json',
        }),
      ],
    });
  });
});
