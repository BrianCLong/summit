"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const incident_manager_1 = require("../../../lib/deployment/incident-manager");
(0, globals_1.describe)('IncidentManager', () => {
    const mockAlertingSystem = {
        getAlerts: globals_1.jest.fn(),
    };
    const mockPagerDutyClient = {
        triggerIncident: globals_1.jest.fn(),
    };
    const mockSlackClient = {
        sendMessage: globals_1.jest.fn(),
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
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should detect a critical alert and create an incident', async () => {
        const criticalAlert = { severity: 'critical', message: 'API latency > 2000ms' };
        mockAlertingSystem.getAlerts.mockResolvedValue([criticalAlert]);
        const incidentManager = new incident_manager_1.IncidentManager(config);
        await incidentManager.checkForIncidents();
        // Check notifications
        (0, globals_1.expect)(mockSlackClient.sendMessage).toHaveBeenCalledWith('test-alerts', globals_1.expect.stringContaining('🚨 New Incident: API latency > 2000ms'));
        // Check escalation policy
        (0, globals_1.expect)(mockPagerDutyClient.triggerIncident).toHaveBeenCalledWith('API latency > 2000ms');
        // Check that runbook notification was sent
        (0, globals_1.expect)(mockSlackClient.sendMessage).toHaveBeenCalledWith('test-alerts', globals_1.expect.stringContaining("✅ Runbook 'restart-database' executed for incident"));
    });
    (0, globals_1.it)('should not create a duplicate incident for an already open alert', async () => {
        const criticalAlert = { severity: 'critical', message: 'Filesystem is 95% full' };
        mockAlertingSystem.getAlerts.mockResolvedValue([criticalAlert]);
        const incidentManager = new incident_manager_1.IncidentManager(config);
        // First check creates the incident
        await incidentManager.checkForIncidents();
        (0, globals_1.expect)(mockPagerDutyClient.triggerIncident).toHaveBeenCalledTimes(1);
        // Second check should not create a new one
        await incidentManager.checkForIncidents();
        (0, globals_1.expect)(mockPagerDutyClient.triggerIncident).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('should ignore non-critical alerts', async () => {
        const warningAlert = { severity: 'warning', message: 'High memory usage' };
        mockAlertingSystem.getAlerts.mockResolvedValue([warningAlert]);
        const incidentManager = new incident_manager_1.IncidentManager(config);
        await incidentManager.checkForIncidents();
        (0, globals_1.expect)(mockPagerDutyClient.triggerIncident).not.toHaveBeenCalled();
        (0, globals_1.expect)(mockSlackClient.sendMessage).not.toHaveBeenCalled();
    });
});
