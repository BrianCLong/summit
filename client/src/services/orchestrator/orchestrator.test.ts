import {
  createDefaultMissionPresets,
  createLaunchableOrchestrator,
  defaultModules,
  ModuleSnapshot,
  OrchestratorTask,
} from './index';

jest.setTimeout(10000);

describe('LaunchableOrchestrator', () => {
  it('starts all modules and exposes running statuses', async () => {
    const orchestrator = createLaunchableOrchestrator();
    const snapshots = await orchestrator.startAll();

    expect(snapshots).toHaveLength(defaultModules.length);
    snapshots.forEach((snapshot: ModuleSnapshot) => {
      expect(snapshot.status.state).toBe('running');
      expect(snapshot.definition.capabilities.length).toBeGreaterThan(0);
    });

    const list = orchestrator.listModules();
    list.forEach(({ status }) => {
      expect(status.uptimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  it('dispatches composite launch task across all modules', async () => {
    const orchestrator = createLaunchableOrchestrator();
    await orchestrator.startAll();

    const task: OrchestratorTask = {
      id: 'launch-001',
      name: 'Enterprise Launch Readiness',
      createdAt: new Date().toISOString(),
      priority: 'critical',
      requestedBy: 'launch-director',
      actions: [
        { moduleId: 'maestro-composer', action: 'compose-blueprint' },
        { moduleId: 'build-plane', action: 'prepare-artifacts' },
        { moduleId: 'build-platform', action: 'plan-release' },
        { moduleId: 'company-os', action: 'synchronize-policies' },
        { moduleId: 'switchboard', action: 'route-signal' },
        { moduleId: 'intelgraph', action: 'analyze-graph' },
        { moduleId: 'activities', action: 'generate-report' },
      ],
      metadata: {
        release: 'v24.0.0',
        changeWindow: '2025-01-07T09:00:00Z',
      },
    };

    const record = await orchestrator.dispatchTask(task);
    expect(record.status).toBe('completed');
    expect(record.results).toHaveLength(task.actions.length);
    record.results.forEach((result) => {
      expect(result.status).toBe('success');
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  it('surfaces errors when an action is unsupported', async () => {
    const orchestrator = createLaunchableOrchestrator();
    await orchestrator.startAll();

    const task: OrchestratorTask = {
      id: 'unsupported-001',
      name: 'Unsupported Action',
      createdAt: new Date().toISOString(),
      priority: 'normal',
      requestedBy: 'qa-lead',
      actions: [
        { moduleId: 'maestro-composer', action: 'non-existent-action' },
      ],
    };

    const record = await orchestrator.dispatchTask(task);
    expect(record.status).toBe('error');
    expect(record.results[0].status).toBe('error');
    expect(record.results[0].message).toContain('does not support action');
  });

  it('surfaces errors when a module is missing', async () => {
    const orchestrator = createLaunchableOrchestrator();
    await orchestrator.startAll();

    const task: OrchestratorTask = {
      id: 'missing-module-001',
      name: 'Missing Module',
      createdAt: new Date().toISOString(),
      priority: 'normal',
      requestedBy: 'qa-lead',
      actions: [{ moduleId: 'non-existent', action: 'anything' }],
    };

    const record = await orchestrator.dispatchTask(task);
    expect(record.status).toBe('error');
    expect(record.results[0].status).toBe('error');
    expect(record.results[0].message).toContain('is not registered');
  });

  it('emits task lifecycle events', async () => {
    const orchestrator = createLaunchableOrchestrator();
    await orchestrator.startAll();

    const events: string[] = [];
    orchestrator.on('task:started', (record) => {
      events.push(`started:${record.task.id}`);
    });
    orchestrator.on('task:completed', (record) => {
      events.push(`completed:${record.task.id}`);
    });

    const task: OrchestratorTask = {
      id: 'event-001',
      name: 'Event Emission Test',
      createdAt: new Date().toISOString(),
      priority: 'high',
      requestedBy: 'platform-ops',
      actions: [
        { moduleId: 'switchboard', action: 'sync-webhooks' },
        { moduleId: 'activities', action: 'log-activity' },
      ],
    };

    const record = await orchestrator.dispatchTask(task);
    expect(record.status).toBe('completed');
    expect(events).toEqual([
      `started:${task.id}`,
      `completed:${task.id}`,
    ]);
  });

  it('validates mission presets against the orchestrator catalog', async () => {
    const orchestrator = createLaunchableOrchestrator();
    await orchestrator.startAll();

    const presets = createDefaultMissionPresets();
    presets.forEach((preset) => {
      const issues = orchestrator.validateTask(preset.buildTask());
      expect(issues).toHaveLength(0);
    });
  });
});
