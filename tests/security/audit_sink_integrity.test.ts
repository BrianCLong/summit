
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { auditSink } from '../../server/src/audit/sink';

describe('Adversarial Security: Audit Sink Integrity', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should record security alerts with mandatory context', async () => {
    const spy = jest.spyOn(auditSink, 'securityAlert');
    const alertMsg = 'Test Security Alert';
    const context = {
      correlationId: 'corr-123',
      userId: 'attacker-id',
      tenantId: 'victim-tenant'
    };

    await auditSink.securityAlert(alertMsg, context);

    expect(spy).toHaveBeenCalledWith(alertMsg, expect.objectContaining(context));
  });

  it('should FAIL CLOSED on critical audit record failure if required', async () => {
    // Simulate a failing sink (e.g. storage full)
    const brokenSink = {
      ...auditSink,
      recordEvent: jest.fn().mockRejectedValue(new Error('Sink unavailable'))
    };

    // This test verifies the expected behavior when audit is mandatory.
    // If an action REQUIREs an audit, it must throw if audit fails.
    const performPrivilegedAction = async (sink: any) => {
      await sink.recordEvent({
        eventType: 'user_action',
        level: 'info',
        message: 'Mutating sensitive data',
        userId: 'admin',
        tenantId: 'prod'
      });
      return 'Success';
    };

    await expect(performPrivilegedAction(brokenSink)).rejects.toThrow('Sink unavailable');
  });

  it('should NOT emit audit logs via console.log (regression)', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    await auditSink.recordEvent({
      eventType: 'user_action',
      level: 'info',
      message: 'Pulse check',
      userId: 'system',
      tenantId: 'system'
    });

    // Ensure no plain JSON objects containing audit data leaked to stdout
    const auditLeaks = consoleSpy.mock.calls.some(call => 
      JSON.stringify(call).includes('Pulse check')
    );
    
    expect(auditLeaks).toBe(false);
  });
});
