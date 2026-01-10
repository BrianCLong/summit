import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { IncidentManager } from '../../../lib/deployment/incident-manager';

describe('IncidentManager', () => {
  const mockAlertingSystem = {
    getAlerts: jest.fn(),
  };
  const mockPagerDutyClient = {
    triggerIncident: jest.fn(),
  };
  const mockSlackClient = {
    sendMessage: jest.fn(),
  };

  const config = {
    escalationPolicy: {
      critical: { notify: ['pagerduty'], runbook: 'restart-database' },
    },
    slackChannel: 'test-alerts',
    enablePolling: false,
    alertingSystem: mockAlertingSystem,
    pagerDutyClient: mockPagerDutyClient,
    slackClient: mockSlackClient,
    runbookDelayMs: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect a critical alert and create an incident', async () => {
    const criticalAlert = { severity: 'critical', message: 'API latency > 2000ms' };
    mockAlertingSystem.getAlerts.mockResolvedValue([criticalAlert]);

    const incidentManager = new IncidentManager(config);
    await incidentManager.checkForIncidents();

    // Check notifications
    expect(mockSlackClient.sendMessage).toHaveBeenCalledWith(
      'test-alerts',
      expect.stringContaining('🚨 New Incident: API latency > 2000ms')
    );

    // Check escalation policy
    expect(mockPagerDutyClient.triggerIncident).toHaveBeenCalledWith('API latency > 2000ms');

    // Check that runbook notification was sent
    expect(mockSlackClient.sendMessage).toHaveBeenCalledWith(
      'test-alerts',
      expect.stringContaining("✅ Runbook 'restart-database' executed for incident")
    );
  });

  it('should not create a duplicate incident for an already open alert', async () => {
    const criticalAlert = { severity: 'critical', message: 'Filesystem is 95% full' };
    mockAlertingSystem.getAlerts.mockResolvedValue([criticalAlert]);

    const incidentManager = new IncidentManager(config);

    // First check creates the incident
    await incidentManager.checkForIncidents();
    expect(mockPagerDutyClient.triggerIncident).toHaveBeenCalledTimes(1);

    // Second check should not create a new one
    await incidentManager.checkForIncidents();
    expect(mockPagerDutyClient.triggerIncident).toHaveBeenCalledTimes(1);
  });

  it('should ignore non-critical alerts', async () => {
    const warningAlert = { severity: 'warning', message: 'High memory usage' };
    mockAlertingSystem.getAlerts.mockResolvedValue([warningAlert]);

    const incidentManager = new IncidentManager(config);
    await incidentManager.checkForIncidents();

    expect(mockPagerDutyClient.triggerIncident).not.toHaveBeenCalled();
    expect(mockSlackClient.sendMessage).not.toHaveBeenCalled();
  });
});
