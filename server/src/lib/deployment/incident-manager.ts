
// Mock external services for demonstration
const mockAlertingSystem = {
  getAlerts: async (): Promise<Array<{ severity: 'critical' | 'warning'; message: string }>> => {
    // Simulate a critical alert 5% of the time
    if (Math.random() < 0.05) {
      return [{ severity: 'critical', message: 'Database CPU utilization at 98%' }];
    }
    return [];
  },
};

const mockPagerDutyClient = {
  triggerIncident: async (details: string): Promise<void> => {
    console.log(`[MockPagerDuty] Incident triggered: ${details}`);
  },
};

const mockSlackClient = {
  sendMessage: async (channel: string, message: string): Promise<void> => {
    console.log(`[MockSlack] Posting to #${channel}: ${message}`);
  },
};

interface IncidentManagerConfig {
  escalationPolicy: {
    critical: { notify: string[]; runbook: string };
  };
  slackChannel: string;
}

interface Incident {
  id: string;
  timestamp: Date;
  details: string;
  status: 'open' | 'resolved';
  runbookExecuted: boolean;
}

export class IncidentManager {
  private config: IncidentManagerConfig;
  private openIncidents: Incident[] = [];

  constructor(config: IncidentManagerConfig) {
    this.config = config;
    setInterval(() => this.checkForIncidents(), 60000); // Check every minute
  }

  public async checkForIncidents(): Promise<void> {
    console.log('Checking for new incidents...');
    const alerts = await mockAlertingSystem.getAlerts();
    for (const alert of alerts) {
      if (alert.severity === 'critical' && !this.isOpenIncident(alert.message)) {
        await this.handleIncident(alert.message);
      }
    }
  }

  private async handleIncident(details: string): Promise<void> {
    const incidentId = `INC-${Date.now()}`;
    console.error(`New critical incident detected (${incidentId}): ${details}`);
    const incident: Incident = {
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

  private async enforceEscalationPolicy(incident: Incident): Promise<void> {
    const policy = this.config.escalationPolicy.critical;
    console.log(`Enforcing escalation policy: notifying ${policy.notify.join(', ')}`);
    for (const target of policy.notify) {
      if (target === 'pagerduty') {
        await mockPagerDutyClient.triggerIncident(incident.details);
      }
    }
    await this.executeRunbook(incident, policy.runbook);
  }

  private async executeRunbook(incident: Incident, runbookName: string): Promise<void> {
    console.log(`Executing runbook: ${runbookName}`);
    // In a real system, this would trigger an automated script or workflow.
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate runbook execution time
    incident.runbookExecuted = true;
    console.log(`Runbook ${runbookName} executed successfully.`);
    await this.notify(`✅ Runbook '${runbookName}' executed for incident ${incident.id}.`);
  }

  private async generatePostIncidentReport(incident: Incident): Promise<string> {
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

  private async notify(message: string): Promise<void> {
    await mockSlackClient.sendMessage(this.config.slackChannel, message);
  }

  private isOpenIncident(details: string): boolean {
    return this.openIncidents.some(inc => inc.details === details && inc.status === 'open');
  }
}
