
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { CopilotPolicyService, CopilotActionType, CopilotAction, CopilotContext } from '../services/CopilotPolicyService.js';

describe('CopilotPolicyService', () => {
  const service = CopilotPolicyService.getInstance();

  const mockContext: CopilotContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: ['analyst']
  };

  test('should allow query actions on non-sensitive resources', async () => {
    const action: CopilotAction = {
      type: CopilotActionType.QUERY,
      resource: 'logs:app',
      payload: {}
    };

    const result = await service.checkPolicy(action, mockContext);
    assert.strictEqual(result.allowed, true);
  });

  test('should deny execution without confirmation', async () => {
    const action: CopilotAction = {
      type: CopilotActionType.EXECUTE,
      resource: 'pod:restart',
      payload: { confirmed: false } // Missing confirmation
    };
    // Give user a role that *could* execute if confirmed
    const adminContext = { ...mockContext, roles: ['admin'] };

    const result = await service.checkPolicy(action, adminContext);
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('confirmation'));
  });

  test('should deny execution for unauthorized roles', async () => {
    const action: CopilotAction = {
      type: CopilotActionType.EXECUTE,
      resource: 'pod:restart',
      payload: { confirmed: true }
    };
    // Analyst role is not in allowed list for execution
    const result = await service.checkPolicy(action, mockContext);
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('authorized'));
  });

  test('should allow execution for authorized roles with confirmation', async () => {
    const action: CopilotAction = {
      type: CopilotActionType.EXECUTE,
      resource: 'pod:restart',
      payload: { confirmed: true }
    };
    const adminContext = { ...mockContext, roles: ['admin'] };

    const result = await service.checkPolicy(action, adminContext);
    assert.strictEqual(result.allowed, true);
  });

  test('should protect sensitive resources from non-admins', async () => {
    const action: CopilotAction = {
      type: CopilotActionType.EXECUTE, // or recommend
      resource: 'secrets:api-key',
      payload: { confirmed: true } // ADDED CONFIRMATION
    };
    // Operator has execute permission generally, but sensitive resource check checks for 'admin' specifically in my impl
    const operatorContext = { ...mockContext, roles: ['operator'] };

    const result = await service.checkPolicy(action, operatorContext);
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('sensitive'));
  });
});
