import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { DataRetentionRepository } from '../../retention/repository.js';
import { LitigationHoldService } from '../litigationHoldService.js';
import { MatterIntakeForm } from '../types.js';

const createRepository = () =>
  new DataRetentionRepository({ query: jest.fn() } as any);

describe('LitigationHoldService', () => {
  let repository: DataRetentionRepository;
  let service: LitigationHoldService;

  beforeEach(() => {
    repository = createRepository();
    jest.spyOn(repository, 'setLegalHold').mockResolvedValue();
    service = new LitigationHoldService(repository);
  });

  it('enforces triggering authority, deadlines, and acknowledgements', async () => {
    const form: MatterIntakeForm = {
      matterNumber: 'MTR-001',
      title: 'Contract dispute',
      description: 'Preserve communications and invoices',
      triggeringAuthority: 'gc',
      custodians: ['alice', 'bob'],
      systems: ['email', 'billing'],
      datasets: ['billing-events', 'customer-emails'],
      exposureAssessment: 'High risk of litigation',
      privilegeStatus: 'privileged',
      proposedScope: 'All billing records for ACME',
      nextSteps: ['Notify custodians', 'Pause deletion jobs'],
    };

    const hold = service.intakeMatter(form);

    expect(hold.datasetId).toBe('billing-events');
    expect(hold.datasets).toContain('customer-emails');
    expect(hold.deadlineAcknowledgement.getTime()).toBeGreaterThan(
      hold.issuedAt.getTime(),
    );
    expect(hold.deadlinePreservation.getTime()).toBeGreaterThan(
      hold.deadlineAcknowledgement.getTime(),
    );

    const acknowledged = service.acknowledgeHold(
      hold.id,
      'alice',
      'email',
    );
    expect(acknowledged.acknowledgements).toHaveLength(1);
    expect(
      acknowledged.acknowledgements[0].acknowledgementHash.length,
    ).toBeGreaterThan(10);

    await service.applyHoldToDataset('billing-events', hold);
    expect(repository.setLegalHold).toHaveBeenCalled();
    const callArgs = (repository.setLegalHold as jest.Mock).mock.calls[0][1] as any;
    expect(callArgs.matterNumber).toBe('MTR-001');
    expect(callArgs.custodians).toContain('alice');
    expect(callArgs.acknowledgedBy?.length).toBe(1);
  });

  it('tracks active holds across multiple datasets and releases them', () => {
    const form: MatterIntakeForm = {
      matterNumber: 'MTR-002',
      title: 'Employment dispute',
      description: 'Preserve HR records',
      triggeringAuthority: 'head_of_people',
      custodians: ['charlie'],
      systems: ['hris'],
      datasets: ['hr-records', 'access-logs'],
      exposureAssessment: 'Medium',
      privilegeStatus: 'privileged',
      proposedScope: 'All HRIS exports and access logs',
      nextSteps: ['Notify HR', 'Notify IT'],
    };

    const hold = service.intakeMatter(form);
    expect(service.hasActiveHold('access-logs')).toBe(true);
    expect(service.activeHoldsForDataset('hr-records')).toHaveLength(1);

    service.releaseHold(hold.id, 'gc');
    expect(service.hasActiveHold('access-logs')).toBe(false);
  });

  it('rejects holds from unauthorized authorities', () => {
    const badForm: MatterIntakeForm = {
      matterNumber: 'MTR-003',
      title: 'Unauthorized',
      description: 'Should fail',
      triggeringAuthority: 'deputy_gc',
      custodians: [],
      systems: [],
      datasets: [],
      exposureAssessment: 'low',
      privilegeStatus: 'non-privileged',
      proposedScope: 'n/a',
      nextSteps: [],
    };

    expect(() => service.intakeMatter({ ...badForm, triggeringAuthority: 'cfo' as any })).toThrow(
      'Triggering authority not permitted to issue holds',
    );
    expect(() => service.intakeMatter(badForm)).toThrow(
      'At least one dataset must be associated to a hold',
    );
  });
});
