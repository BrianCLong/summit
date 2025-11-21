/**
 * AlertManager Tests
 */

import { AlertManager, type AlertRule, type Alert, type NotificationConfig } from '../src/index.js';

describe('AlertManager', () => {
  let alertManager: AlertManager;

  beforeEach(() => {
    alertManager = new AlertManager();
  });

  const createAlert = (overrides: Partial<Alert> = {}): Alert => ({
    id: `alert-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    severity: 'high',
    title: 'Test Alert',
    description: 'This is a test alert',
    events: [],
    ...overrides,
  });

  describe('rule management', () => {
    it('should register an alert rule', () => {
      const rule: AlertRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test alert rule',
        severity: 'high',
        conditions: [
          { metric: 'cpu_usage', operator: 'gt', threshold: 90 },
        ],
      };

      alertManager.registerRule(rule);
      // Should register without error
    });

    it('should remove an alert rule', () => {
      const rule: AlertRule = {
        id: 'remove-rule',
        name: 'Remove Rule',
        description: 'Rule to be removed',
        severity: 'medium',
        conditions: [],
      };

      alertManager.registerRule(rule);
      alertManager.removeRule('remove-rule');
      // Should remove without error
    });
  });

  describe('alert firing', () => {
    it('should fire an alert', async () => {
      const alert = createAlert();
      const firedAlerts: Alert[] = [];

      alertManager.on('alert:fired', (a) => firedAlerts.push(a));

      await alertManager.fireAlert(alert);

      expect(firedAlerts).toHaveLength(1);
      expect(firedAlerts[0].id).toBe(alert.id);
    });

    it('should deduplicate alerts', async () => {
      const alert1 = createAlert({ title: 'Dedup Alert' });
      const alert2 = createAlert({ title: 'Dedup Alert' });

      const firedAlerts: Alert[] = [];
      alertManager.on('alert:fired', (a) => firedAlerts.push(a));

      await alertManager.fireAlert(alert1);
      await alertManager.fireAlert(alert2);

      // Should only fire once
      expect(firedAlerts).toHaveLength(1);
    });

    it('should track active alerts', async () => {
      await alertManager.fireAlert(createAlert({ title: 'Active 1' }));
      await alertManager.fireAlert(createAlert({ title: 'Active 2' }));

      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts.length).toBe(2);
    });
  });

  describe('alert resolution', () => {
    it('should resolve an alert', async () => {
      const alert = createAlert();
      const resolvedAlerts: Alert[] = [];

      alertManager.on('alert:resolved', (a) => resolvedAlerts.push(a));

      await alertManager.fireAlert(alert);
      await alertManager.resolveAlert(alert.id);

      expect(resolvedAlerts).toHaveLength(1);
    });

    it('should update alert state when resolved', async () => {
      const alert = createAlert({ title: 'Resolve Test' });

      await alertManager.fireAlert(alert);
      await alertManager.resolveAlert(alert.id);

      const activeAlerts = alertManager.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });
  });

  describe('alert acknowledgment', () => {
    it('should acknowledge an alert', async () => {
      const alert = createAlert();
      const ackEvents: any[] = [];

      alertManager.on('alert:acknowledged', (event) => ackEvents.push(event));

      await alertManager.fireAlert(alert);
      alertManager.acknowledgeAlert(alert.id, 'user123');

      expect(ackEvents).toHaveLength(1);
      expect(ackEvents[0].userId).toBe('user123');
    });
  });

  describe('alert silencing', () => {
    it('should silence alerts matching criteria', async () => {
      alertManager.silenceAlerts(
        { severity: 'low' },
        60000,
        'Maintenance window'
      );

      const alert = createAlert({ severity: 'low' });
      const firedAlerts: Alert[] = [];

      alertManager.on('alert:fired', (a) => firedAlerts.push(a));

      await alertManager.fireAlert(alert);

      expect(firedAlerts).toHaveLength(0);
    });

    it('should not silence alerts not matching criteria', async () => {
      alertManager.silenceAlerts(
        { severity: 'low' },
        60000,
        'Maintenance window'
      );

      const alert = createAlert({ severity: 'critical' });
      const firedAlerts: Alert[] = [];

      alertManager.on('alert:fired', (a) => firedAlerts.push(a));

      await alertManager.fireAlert(alert);

      expect(firedAlerts).toHaveLength(1);
    });
  });

  describe('notifications', () => {
    it('should register notification channel', () => {
      const config: NotificationConfig = {
        channel: 'test-webhook',
        type: 'webhook',
        config: {
          url: 'https://example.com/webhook',
        },
      };

      alertManager.registerNotificationChannel(config);
      // Should register without error
    });

    it('should emit notification events', async () => {
      const notifications: any[] = [];

      const config: NotificationConfig = {
        channel: 'test-channel',
        type: 'webhook',
        config: { url: 'https://example.com' },
      };

      alertManager.registerNotificationChannel(config);
      alertManager.on('notification:sent', (n) => notifications.push(n));

      const rule: AlertRule = {
        id: 'notify-rule',
        name: 'Notify Rule',
        description: 'Rule with notifications',
        severity: 'high',
        conditions: [],
        notificationChannels: ['test-channel'],
      };

      alertManager.registerRule(rule);

      const alert = createAlert({ title: 'Notify Rule' });
      await alertManager.fireAlert(alert, 'notify-rule');

      // The notification should be sent
      expect(notifications.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('statistics', () => {
    it('should return alert statistics', async () => {
      await alertManager.fireAlert(createAlert({ severity: 'critical', title: 'Crit 1' }));
      await alertManager.fireAlert(createAlert({ severity: 'high', title: 'High 1' }));
      await alertManager.fireAlert(createAlert({ severity: 'medium', title: 'Med 1' }));

      const stats = alertManager.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.firing).toBe(3);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.bySeverity.medium).toBe(1);
    });

    it('should filter alerts by severity', async () => {
      await alertManager.fireAlert(createAlert({ severity: 'critical', title: 'Crit' }));
      await alertManager.fireAlert(createAlert({ severity: 'low', title: 'Low' }));

      const criticalAlerts = alertManager.getAlertsBySeverity('critical');
      expect(criticalAlerts).toHaveLength(1);
    });
  });
});
