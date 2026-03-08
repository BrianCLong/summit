"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentManager = void 0;
// Mock external services for demonstration
const defaultAlertingSystem = {
    getAlerts: async () => {
        // Simulate a critical alert 5% of the time
        if (Math.random() < 0.05) {
            return [{ severity: 'critical', message: 'Database CPU utilization at 98%' }];
        }
        return [];
    },
};
const defaultPagerDutyClient = {
    triggerIncident: async (details) => {
        console.log(`[MockPagerDuty] Incident triggered: ${details}`);
    },
};
const defaultSlackClient = {
    sendMessage: async (channel, message) => {
        console.log(`[MockSlack] Posting to #${channel}: ${message}`);
    },
};
class IncidentManager {
    config;
    openIncidents = [];
    poller = null;
    alertingSystem;
    pagerDutyClient;
    slackClient;
    runbookDelayMs;
    constructor(config) {
        this.config = config;
        this.alertingSystem = config.alertingSystem ?? defaultAlertingSystem;
        this.pagerDutyClient = config.pagerDutyClient ?? defaultPagerDutyClient;
        this.slackClient = config.slackClient ?? defaultSlackClient;
        this.runbookDelayMs = config.runbookDelayMs ?? 5000;
        const enablePolling = config.enablePolling ?? true;
        if (enablePolling) {
            const intervalMs = config.pollingIntervalMs ?? 60000;
            this.poller = setInterval(() => this.checkForIncidents(), intervalMs);
        }
    }
    async checkForIncidents() {
        console.log('Checking for new incidents...');
        const alerts = await this.alertingSystem.getAlerts();
        for (const alert of alerts) {
            if (alert.severity === 'critical' && !this.isOpenIncident(alert.message)) {
                await this.handleIncident(alert.message);
            }
        }
    }
    async handleIncident(details) {
        const incidentId = `INC-${Date.now()}`;
        console.error(`New critical incident detected (${incidentId}): ${details}`);
        const incident = {
            id: incidentId,
            timestamp: new Date(),
            details,
            status: 'open',
            runbookExecuted: false,
        };
        this.openIncidents.push(incident);
        await this.notify(`🚨 New Incident: ${details}`);
        await this.enforceEscalationPolicy(incident);
        await this.generatePostIncidentReport(incident);
    }
    async enforceEscalationPolicy(incident) {
        const policy = this.config.escalationPolicy.critical;
        console.log(`Enforcing escalation policy: notifying ${policy.notify.join(', ')}`);
        for (const target of policy.notify) {
            if (target === 'pagerduty') {
                await this.pagerDutyClient.triggerIncident(incident.details);
            }
        }
        await this.executeRunbook(incident, policy.runbook);
    }
    async executeRunbook(incident, runbookName) {
        console.log(`Executing runbook: ${runbookName}`);
        // In a real system, this would trigger an automated script or workflow.
        await new Promise(resolve => setTimeout(resolve, this.runbookDelayMs));
        incident.runbookExecuted = true;
        console.log(`Runbook ${runbookName} executed successfully.`);
        await this.notify(`✅ Runbook '${runbookName}' executed for incident ${incident.id}.`);
    }
    async generatePostIncidentReport(incident) {
        console.log(`Generating post-incident report for ${incident.id}`);
        const report = `
      # Post-Incident Report: ${incident.id}
      - **Detected at:** ${incident.timestamp.toISOString()}
      - **Details:** ${incident.details}
      - **Runbook Executed:** ${incident.runbookExecuted}
      - **Status:** ${incident.status}
    `;
        // In a real system, this might be saved to a knowledge base like Confluence.
        return report.trim();
    }
    async notify(message) {
        await this.slackClient.sendMessage(this.config.slackChannel, message);
    }
    isOpenIncident(details) {
        return this.openIncidents.some(inc => inc.details === details && inc.status === 'open');
    }
}
exports.IncidentManager = IncidentManager;
