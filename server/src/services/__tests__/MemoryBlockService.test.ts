import { jest } from '@jest/globals';
import { type ManagedPostgresPool } from '../../db/postgres.js';
import { MemoryBlockService, type MemoryBlock } from '../MemoryBlockService.js';

describe('MemoryBlockService', () => {
  const baseRow = {
    block_id: 'block-1',
    tenant_id: 'tenant-1',
    owner_type: 'agent',
    owner_id: 'agent-1',
    label: 'human',
    value: 'hello',
    size_limit: 20,
    description: null,
    is_read_only: false,
    scope: 'LOCAL',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('enforces size limits on create', async () => {
    const query = jest.fn();
    const pool = { query } as unknown as ManagedPostgresPool;
    const service = new MemoryBlockService(pool);

    await expect(
      service.createBlock({
        tenantId: 'tenant-1',
        ownerType: 'agent',
        ownerId: 'agent-1',
        label: 'persona',
        value: '123456',
        sizeLimit: 5,
      }),
    ).rejects.toThrow('Value exceeds size limit');
  });

  it('prevents updates to read-only blocks', async () => {
    const query = jest.fn();
    query.mockResolvedValueOnce({
      rows: [{ ...baseRow, is_read_only: true }],
    });
    const pool = { query } as unknown as ManagedPostgresPool;

    const service = new MemoryBlockService(pool);

    await expect(
      service.replaceBlockValue({
        blockId: 'block-1',
        tenantId: 'tenant-1',
        newValue: 'updated',
        actorId: 'agent-1',
        actorType: 'agent',
      }),
    ).rejects.toThrow('Memory block is read-only');
  });

  it('requires shared write permissions for non-owners', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce({
        rows: [{ ...baseRow, owner_id: 'agent-2', scope: 'SHARED' }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const pool = { query } as unknown as ManagedPostgresPool;

    const service = new MemoryBlockService(pool);

    await expect(
      service.replaceBlockValue({
        blockId: 'block-1',
        tenantId: 'tenant-1',
        newValue: 'updated',
        actorId: 'agent-1',
        actorType: 'agent',
      }),
    ).rejects.toThrow('Write not permitted for this block');
  });

  it('allows owners to update when actor type matches', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce({
        rows: [{ ...baseRow, owner_type: 'user', owner_id: 'user-1' }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            ...baseRow,
            owner_type: 'user',
            owner_id: 'user-1',
            value: 'updated',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const pool = { query } as unknown as ManagedPostgresPool;
    const service = new MemoryBlockService(pool);

    const updated = await service.replaceBlockValue({
      blockId: 'block-1',
      tenantId: 'tenant-1',
      newValue: 'updated',
      actorId: 'user-1',
      actorType: 'user',
    });

    expect(updated.value).toBe('updated');
  });

  it('compiles deterministic prompt sections', async () => {
    const query = jest.fn();
    query.mockResolvedValue({
      rows: [
        { ...baseRow, block_id: 'b-2', label: 'persona', value: 'B', size_limit: 10 },
        { ...baseRow, block_id: 'b-1', label: 'alpha', value: 'A', size_limit: 10 },
      ],
    });
    const pool = { query } as unknown as ManagedPostgresPool;

    const service = new MemoryBlockService(pool);
    const prompt = await service.compilePromptSection({
      tenantId: 'tenant-1',
      agentId: 'agent-1',
    });

    const [first, second] = prompt.split('\n\n');
    expect(first.startsWith('- [alpha')).toBe(true);
    expect(second.startsWith('- [persona')).toBe(true);
  });

  it('applies reflection updates and returns new blocks', async () => {
    const block = {
      ...baseRow,
      block_id: 'b-3',
      label: 'research_state',
      value: 'prior',
      size_limit: 120,
    };
    const service = new MemoryBlockService({} as ManagedPostgresPool);

    const memoryBlock: MemoryBlock = {
      blockId: block.block_id,
      tenantId: block.tenant_id,
      ownerType: 'agent',
      ownerId: block.owner_id,
      label: block.label,
      value: block.value,
      sizeLimit: block.size_limit,
      description: block.description,
      isReadOnly: block.is_read_only,
      scope: block.scope as 'LOCAL',
    };

    jest.spyOn(service, 'getBlocksForAgent').mockResolvedValue([memoryBlock]);

    const replaceSpy = jest
      .spyOn(service, 'replaceBlockValue')
      .mockImplementation(async ({ newValue }) => ({
        blockId: block.block_id,
        tenantId: block.tenant_id,
        ownerType: 'agent',
        ownerId: block.owner_id,
        label: block.label,
        value: newValue,
        sizeLimit: block.size_limit,
        description: block.description,
        isReadOnly: block.is_read_only,
        scope: block.scope as 'LOCAL',
      }));

    const updates = await service.reflectAndUpdateBlocks({
      tenantId: 'tenant-1',
      agentId: 'agent-1',
      labels: ['research_state'],
      delta: 'New findings about incident X',
      actorId: 'agent-1',
      actorType: 'agent',
    });

    expect(replaceSpy).toHaveBeenCalled();
    expect(updates[0].value).toContain('Reflection: New findings about incident X');
  });
});
