import { RampController } from '../ramp-controller.js';

const publishMock = jest.fn();

jest.mock('../../../events/EventService.js', () => ({
  eventService: {
    publish: (...args: unknown[]) => publishMock(...args),
  },
}));

describe('RampController', () => {
  beforeEach(() => {
    publishMock.mockClear();
  });

  it('reduces ramp and emits incident event on receipt backlog breach', async () => {
    const controller = new RampController({
      maxErrorRate: 0.5,
      maxReceiptBacklog: 100,
      reductionStepPercent: 10,
      rollbackFloorPercent: 5,
    });

    const decision = await controller.evaluate(
      { errorRate: 0.1, receiptBacklog: 200 },
      {
        tenantId: 'tenant-1',
        serviceName: 'conductor',
        deploymentId: 'deploy-1',
        rampPercent: 30,
      },
    );

    expect(decision.action).toBe('reduce');
    expect(decision.nextPercent).toBe(20);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock.mock.calls[0][0]).toMatchObject({
      tenant_id: 'tenant-1',
      type: 'incident.created',
      payload: expect.objectContaining({
        action: 'reduce',
      }),
    });
  });

  it('triggers rollback and emits incident event at rollback floor', async () => {
    const controller = new RampController({
      maxErrorRate: 0.5,
      maxReceiptBacklog: 100,
      reductionStepPercent: 10,
      rollbackFloorPercent: 5,
    });
    const rollback = jest.fn().mockResolvedValue(undefined);

    const decision = await controller.evaluate(
      { errorRate: 0.6, receiptBacklog: 20 },
      {
        tenantId: 'tenant-1',
        serviceName: 'conductor',
        deploymentId: 'deploy-2',
        rampPercent: 5,
      },
      rollback,
    );

    expect(decision.action).toBe('rollback');
    expect(decision.nextPercent).toBe(0);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock.mock.calls[0][0]).toMatchObject({
      tenant_id: 'tenant-1',
      type: 'incident.created',
      payload: expect.objectContaining({
        action: 'rollback',
      }),
    });
  });
});
