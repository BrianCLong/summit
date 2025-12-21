import { CanonicalEvent } from './events.js';

export type FixItAction = {
  code: string;
  description: string;
  retryable: boolean;
  resolution: () => Promise<{ status: 'success' | 'noop'; details?: string }>;
};

export class FixItPanelService {
  private failures = new Map<string, FixItAction[]>();

  recordFailure(workspaceId: string, event: CanonicalEvent): FixItAction[] {
    const actions = this.failures.get(workspaceId) ?? [];
    const action = this.actionFor(event);
    if (action) {
      actions.push(action);
      this.failures.set(workspaceId, actions);
    }
    return actions;
  }

  getActions(workspaceId: string): FixItAction[] {
    return this.failures.get(workspaceId) ?? [];
  }

  private actionFor(event: CanonicalEvent): FixItAction | undefined {
    switch (event.type) {
      case 'validation_error':
        return {
          code: 'validation-retry',
          description: 'Fix inline validation errors and retry the step',
          retryable: true,
          resolution: async () => ({ status: 'success', details: 'Validation cleared' }),
        };
      case 'integration_failed':
        return {
          code: 'integration-retry',
          description: 'Retry integration with backoff and fresh credentials',
          retryable: true,
          resolution: async () => ({ status: 'success', details: 'Integration retry scheduled' }),
        };
      case 'entitlement_blocked':
        return {
          code: 'entitlement-upgrade',
          description: 'Upgrade plan to unlock requested capability',
          retryable: false,
          resolution: async () => ({ status: 'noop', details: 'Prompted upgrade' }),
        };
      default:
        return undefined;
    }
  }
}
