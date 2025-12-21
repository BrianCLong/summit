import { ActivationService } from '../../activation/ActivationService.js';
import { canonicalEventSchema } from '../../activation/events.js';

describe('ActivationService', () => {
  const service = new ActivationService();

  const baseEvent = {
    id: '00000000-0000-0000-0000-000000000001',
    workspaceId: 'ws-1',
    userId: 'user-1',
    role: 'admin' as const,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  };

  it('tracks aha conversion within 15 minutes', () => {
    service.recordEvent({ ...baseEvent, type: 'workspace_created' });
    service.recordEvent({ ...baseEvent, type: 'entity_linked' });
    service.recordEvent({ ...baseEvent, type: 'insight_saved' });

    const metrics = service.getMetrics();
    expect(metrics.ahaRateWithin15m).toBe(1);
    expect(metrics.completed).toBe(1);
  });

  it('calculates drop-off by step across roles', () => {
    const operatorEvent = { ...baseEvent, workspaceId: 'ws-2', id: '00000000-0000-0000-0000-000000000002', role: 'operator' as const };
    service.recordEvent({ ...operatorEvent, type: 'workspace_created' });
    service.recordEvent({ ...operatorEvent, type: 'guided_step_completed', stepName: 'integration' });

    const metrics = service.getMetrics();
    expect(metrics.dropOffByStep['workspace_created']).toBeGreaterThan(0);
    expect(metrics.dropOffByStep['guided_step_completed:integration']).toBeGreaterThan(0);
  });

  it('enforces inline validation and surfaces errors', () => {
    const result = service.validateWorkspace({
      workspaceName: 'ok',
      orgDomain: 'invalid-domain',
      region: 'us-east',
      notificationsEnabled: true,
      starterTemplate: 'analyst',
    });

    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('provisions starter data idempotently', () => {
    service.recordEvent({
      ...baseEvent,
      workspaceId: 'ws-3',
      id: '00000000-0000-0000-0000-000000000003',
      type: 'starter_data_provisioned',
      role: 'viewer',
    });

    const first = service.getStarterData('ws-3');
    const second = service.getStarterData('ws-3');
    expect(first).toEqual(second);
    expect(first?.template).toBe('viewer');
  });

  it('returns upgrade prompt when plan limits are hit', () => {
    const planLimitEvent = {
      ...baseEvent,
      workspaceId: 'ws-4',
      id: '00000000-0000-0000-0000-000000000004',
      type: 'plan_limit_hit' as const,
      role: 'operator' as const,
    };

    const { prompt } = service.recordEvent(planLimitEvent);
    expect(prompt?.reason).toBe('limit_near');
  });

  it('logs experiment exposures when value prompts trigger', () => {
    service.recordEvent({
      ...baseEvent,
      workspaceId: 'ws-5',
      id: '00000000-0000-0000-0000-000000000005',
      type: 'insight_saved',
    });

    const exposure = service.logExposure('ws-5', 'activation.valuePrompt');
    expect(exposure.flag).toBe('activation.valuePrompt');
  });

  it('surfaces fix-it actions for recoverable failures', async () => {
    const failureEvent = canonicalEventSchema.parse({
      ...baseEvent,
      workspaceId: 'ws-6',
      id: '00000000-0000-0000-0000-000000000006',
      type: 'validation_error',
    });

    const { fixIt } = service.recordEvent(failureEvent);
    expect(fixIt?.[0].retryable).toBe(true);
    const resolution = await fixIt?.[0].resolution();
    expect(resolution?.status).toBe('success');
  });
});
