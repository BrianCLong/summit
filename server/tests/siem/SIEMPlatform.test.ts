import { siemPlatform } from '../../src/siem/SIEMPlatform.js';
import { describe, it, beforeEach, expect } from '@jest/globals';

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

    expect(event.id).toBeDefined();
    expect(event.eventType).toBe('login_success');
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
    expect(alerts.length).toBe(0);

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
    expect(alerts.length).toBeGreaterThan(0);

    // Verify it's the right alert (check timestamp or IP)
    const recentAlert = alerts.find(a => a.description.includes('192.168.1.100'));
    expect(recentAlert).toBeDefined();
  });
});
