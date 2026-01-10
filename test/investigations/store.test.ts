import { InMemoryInvestigationStore } from '../../server/src/investigations/store';
import { EntityRef } from '../../server/src/investigations/types';

describe('InMemoryInvestigationStore', () => {
  const createIdGenerator = (values: string[]) => {
    let index = 0;
    return () => {
      const id = values[index];
      index += 1;
      return id;
    };
  };

  const createClock = (start: Date) => {
    let counter = 0;
    return () => new Date(start.getTime() + counter++ * 1000);
  };

  it('creates workspaces, cases, notes, and entity refs deterministically', () => {
    const idGenerator = createIdGenerator(['w1', 'c1', 'n1', 'e1']);
    const clock = createClock(new Date('2024-01-01T00:00:00Z'));
    const store = new InMemoryInvestigationStore({ idGenerator, clock });

    const workspace = store.createWorkspace('tenant-1', 'Alpha');
    const investigationCase = store.createCase('tenant-1', workspace.id, {
      title: 'Initial case',
    });
    const note = store.addNote('tenant-1', investigationCase.id, {
      author_id: 'analyst-1',
      body: 'Bootstrapped note',
    });
    const entityRef: EntityRef = {
      type: 'account',
      external_id: 'acct-1',
      display_name: 'Account 1',
    };
    store.attachEntityRef('tenant-1', investigationCase.id, entityRef);

    expect(workspace).toMatchObject({
      id: 'w1',
      tenant_id: 'tenant-1',
      name: 'Alpha',
      created_at: new Date('2024-01-01T00:00:00.000Z'),
    });

    expect(investigationCase).toMatchObject({
      id: 'c1',
      workspace_id: 'w1',
      title: 'Initial case',
      status: 'open',
    });

    expect(note).toMatchObject({
      id: 'n1',
      case_id: 'c1',
      author_id: 'analyst-1',
      body: 'Bootstrapped note',
      created_at: new Date('2024-01-01T00:00:01.000Z'),
    });

    expect(store.listWorkspaces('tenant-1')).toHaveLength(1);
    expect(store.listCases('tenant-1', workspace.id)).toHaveLength(1);
    expect(store.listNotes('tenant-1', investigationCase.id)).toHaveLength(1);
    expect(store.listEntityRefs('tenant-1', investigationCase.id)).toEqual([entityRef]);
  });

  it('enforces tenant isolation across workspaces and cases', () => {
    const store = new InMemoryInvestigationStore({
      idGenerator: createIdGenerator(['w1', 'c1']),
      clock: createClock(new Date('2024-01-01T00:00:00Z')),
    });

    const workspace = store.createWorkspace('tenant-A', 'Tenant A Workspace');
    store.createCase('tenant-A', workspace.id, { title: 'Tenant A Case' });

    expect(store.listWorkspaces('tenant-B')).toEqual([]);

    expect(() =>
      store.createCase('tenant-B', workspace.id, { title: 'Cross-tenant case' }),
    ).toThrow('Tenant scope violation');

    expect(() => store.listNotes('tenant-B', 'c1')).toThrow('Tenant scope violation');
  });

  it('updates case status with tenant-aware validation', () => {
    const store = new InMemoryInvestigationStore({
      idGenerator: createIdGenerator(['w1', 'c1']),
      clock: createClock(new Date('2024-01-01T00:00:00Z')),
    });
    const workspace = store.createWorkspace('tenant-1', 'Alpha');
    const investigationCase = store.createCase('tenant-1', workspace.id, { title: 'Case 1' });

    const updated = store.updateCaseStatus('tenant-1', investigationCase.id, 'closed');
    expect(updated.status).toBe('closed');

    expect(() => store.updateCaseStatus('tenant-2', investigationCase.id, 'open')).toThrow(
      'Tenant scope violation',
    );
  });
});
