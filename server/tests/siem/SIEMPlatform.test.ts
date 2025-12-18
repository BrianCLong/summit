import { siemPlatform } from '../../src/siem/SIEMPlatform.js';
import { defaultRules } from '../../src/siem/rules.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('SIEMPlatform', () => {
  beforeEach(() => {
    siemPlatform.reset();
  });

  it('should ingest an event', async () => {
    const event = await siemPlatform.ingestEvent({
      eventType: 'login_success',
      source: 'test',
      message: 'User logged in',
      userId: 'user1'
    });

    assert.ok(event.id);
    assert.strictEqual(event.eventType, 'login_success');
  });

  it('should correlate events and trigger alert', async () => {
    // Rule: Brute Force (5 failures in 60s)
    const userId = 'attacker-' + Date.now();

    // Ingest 4 failures
    for(let i=0; i<4; i++) {
        await siemPlatform.ingestEvent({
            eventType: 'login_failed',
            source: 'auth-service',
            message: 'Failed login',
            userId: userId,
            ipAddress: '192.168.1.100'
        });
    }

    // Should not alert yet
    let alerts = siemPlatform.getAlerts({}).filter(a => a.description.includes(userId));
    assert.strictEqual(alerts.length, 0);

    // 5th failure
    await siemPlatform.ingestEvent({
        eventType: 'login_failed',
        source: 'auth-service',
        message: 'Failed login',
        userId: userId,
        ipAddress: '192.168.1.100'
    });

    // Should alert now
    alerts = siemPlatform.getAlerts({}).filter(a => a.title.includes('Brute Force'));
    assert.ok(alerts.length > 0, 'Expected brute force alert to be triggered');

    // Verify it's the right alert (check timestamp or IP)
    const recentAlert = alerts.find(a => a.description.includes('192.168.1.100'));
    assert.ok(recentAlert, 'Expected alert description to contain the IP');
  });
});
