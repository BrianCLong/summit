import { IncidentManager } from '../../../lib/deployment/incident-manager';

// Mock dependencies
jest.mock('../../../lib/deployment/incident-manager', () => {
  const originalModule = jest.requireActual('../../../lib/deployment/incident-manager');
  return {
    ...originalModule,
    mockAlertingSystem: {
      getAlerts: jest.fn(),
    },
    mockPagerDutyClient: {
      triggerIncident: jest.fn(),
    },
    mockSlackClient: {
      sendMessage: jest.fn(),
    },
  };
});

const { mockAlertingSystem, mockPagerDutyClient, mockSlackClient } = jest.requireMock('../../../lib/deployment/incident-manager');

describe('IncidentManager', () => {
  const config = {
    escalationPolicy: {
      critical: { notify: ['pagerduty'], runbook: 'restart-database' },
    },
    slackChannel: 'test-alerts',
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
