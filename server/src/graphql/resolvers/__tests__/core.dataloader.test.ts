import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { coreResolvers } from '../core';
import { createLoaders } from '../../dataloaders/index.js';
import { entityRepo, investigationRepo } from '../../context/repositories.js';

describe('coreResolvers DataLoader integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the entity DataLoader for relationship endpoints', async () => {
    const loaders = createLoaders();
    const context = { loaders };
    const parent = { srcId: 'entity-1', dstId: 'entity-1', tenantId: 'tenant-a' };

    const entity = {
      id: 'entity-1',
      tenantId: 'tenant-a',
      kind: 'Person',
      labels: ['Entity'],
      props: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'tester',
    };

    const batchSpy = jest
      .spyOn(entityRepo, 'batchByIds')
      .mockResolvedValue([entity]);
    const fallbackSpy = jest.spyOn(entityRepo, 'findById');

    const first = await (coreResolvers.Relationship as any).source(parent, {}, context);
    const second = await (coreResolvers.Relationship as any).source(parent, {}, context);

    expect(first).toEqual(entity);
    expect(second).toEqual(entity);
    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(batchSpy).toHaveBeenCalledWith(['entity-1'], 'tenant-a');
    expect(fallbackSpy).not.toHaveBeenCalled();
  });

  it('uses the investigation DataLoader when resolving entity.investigation', async () => {
    const loaders = createLoaders();
    const context = { loaders };
    const parent = { tenantId: 'tenant-a', props: { investigationId: 'inv-1' } };

    const investigation = {
      id: 'inv-1',
      tenantId: 'tenant-a',
      name: 'Test Investigation',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'tester',
      props: {},
      description: 'description',
    } as any;

    const batchSpy = jest
      .spyOn(investigationRepo, 'batchByIds')
      .mockResolvedValue([investigation]);
    const fallbackSpy = jest.spyOn(investigationRepo, 'findById');

    const first = await (coreResolvers.Entity as any).investigation(parent, {}, context);
    const second = await (coreResolvers.Entity as any).investigation(parent, {}, context);

    expect(first).toEqual(investigation);
    expect(second).toEqual(investigation);
    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(batchSpy).toHaveBeenCalledWith(['inv-1'], 'tenant-a');
    expect(fallbackSpy).not.toHaveBeenCalled();
  });
});
