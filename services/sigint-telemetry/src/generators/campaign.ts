/**
 * Attack Campaign Generator
 *
 * Generates synthetic attack campaigns for blue team simulation.
 * Models ATT&CK-style TTP chains on synthetic infrastructure.
 *
 * IMPORTANT: This is SIMULATION ONLY for defensive testing.
 */

import { v4 as uuidv4 } from 'uuid';
import { SeededRandom, syntheticTimestamp } from './utils.js';
import { generateAuthEvent } from './identity.js';
import { generateProcessEvent, generateEdrAlert } from './endpoint.js';
import { generateNetworkFlow, generateDnsEvent } from './network.js';
import { generateIamEvent, generateApiCallEvent } from './cloud.js';

/** MITRE ATT&CK Tactic */
export type MitreTactic =
  | 'initial_access'
  | 'execution'
  | 'persistence'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'lateral_movement'
  | 'collection'
  | 'exfiltration';

/** Campaign step definition */
export interface CampaignStep {
  tactic: MitreTactic;
  technique: string;
  description: string;
  events: unknown[];
  timestamp: string;
}

/** Full campaign definition */
export interface Campaign {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  steps: CampaignStep[];
  isSynthetic: true;
}

/** Campaign template */
export interface CampaignTemplate {
  name: string;
  description: string;
  tactics: MitreTactic[];
}

/** Predefined campaign templates */
export const campaignTemplates: CampaignTemplate[] = [
  {
    name: 'Credential Theft and Lateral Movement',
    description: 'Simulates phishing -> credential theft -> lateral movement',
    tactics: ['initial_access', 'credential_access', 'lateral_movement', 'collection'],
  },
  {
    name: 'Cloud Account Compromise',
    description: 'Simulates cloud credential compromise and privilege escalation',
    tactics: ['initial_access', 'privilege_escalation', 'discovery', 'exfiltration'],
  },
  {
    name: 'Insider Threat',
    description: 'Simulates malicious insider data exfiltration',
    tactics: ['collection', 'exfiltration'],
  },
];

/** Generate a synthetic campaign */
export function generateCampaign(
  template: CampaignTemplate,
  config: { rng?: SeededRandom; tenantId?: string } = {}
): Campaign {
  const rng = config.rng ?? new SeededRandom();
  const startTime = new Date(Date.now() - rng.int(3600000, 86400000));
  const steps: CampaignStep[] = [];

  let currentTime = startTime;

  for (const tactic of template.tactics) {
    const stepDuration = rng.int(300000, 3600000); // 5min to 1hr per step
    currentTime = new Date(currentTime.getTime() + stepDuration);

    const step = generateCampaignStep(tactic, {
      rng,
      baseTime: currentTime,
      tenantId: config.tenantId,
    });
    steps.push(step);
  }

  return {
    id: uuidv4(),
    name: template.name,
    description: template.description,
    startTime: startTime.toISOString(),
    endTime: currentTime.toISOString(),
    steps,
    isSynthetic: true,
  };
}

/** Generate events for a campaign step */
function generateCampaignStep(
  tactic: MitreTactic,
  config: { rng: SeededRandom; baseTime: Date; tenantId?: string }
): CampaignStep {
  const { rng, baseTime, tenantId } = config;
  const events: unknown[] = [];

  switch (tactic) {
    case 'initial_access': {
      // Suspicious auth from unusual location
      const authEvent = generateAuthEvent({ rng, baseTime, tenantId });
      authEvent.impossibleTravel = true;
      authEvent.riskScore = rng.int(70, 95);
      events.push(authEvent);
      return {
        tactic,
        technique: 'T1078 - Valid Accounts',
        description: 'Initial access via compromised credentials from unusual location',
        events,
        timestamp: syntheticTimestamp(baseTime),
      };
    }

    case 'execution': {
      const procEvent = generateProcessEvent({ rng, baseTime, tenantId });
      procEvent.processName = 'powershell.exe';
      procEvent.isElevated = true;
      events.push(procEvent);
      return {
        tactic,
        technique: 'T1059.001 - PowerShell',
        description: 'Execution of encoded PowerShell command',
        events,
        timestamp: syntheticTimestamp(baseTime),
      };
    }

    case 'credential_access': {
      const alert = generateEdrAlert({ rng, baseTime, tenantId });
      alert.alertName = 'LSASS Memory Access';
      alert.mitreTechniques = ['T1003.001'];
      alert.severity = 'critical';
      events.push(alert);
      return {
        tactic,
        technique: 'T1003.001 - LSASS Memory',
        description: 'Attempted credential dumping from LSASS',
        events,
        timestamp: syntheticTimestamp(baseTime),
      };
    }

    case 'lateral_movement': {
      const flowEvent = generateNetworkFlow({ rng, baseTime, tenantId });
      flowEvent.destination.port = 3389;
      flowEvent.direction = 'lateral';
      events.push(flowEvent);
      return {
        tactic,
        technique: 'T1021.001 - Remote Desktop Protocol',
        description: 'Lateral movement via RDP to internal host',
        events,
        timestamp: syntheticTimestamp(baseTime),
      };
    }

    case 'privilege_escalation': {
      const iamEvent = generateIamEvent({ rng, baseTime, tenantId });
      iamEvent.action = 'policy_attached';
      events.push(iamEvent);
      return {
        tactic,
        technique: 'T1078.004 - Cloud Accounts',
        description: 'Privilege escalation via IAM policy attachment',
        events,
        timestamp: syntheticTimestamp(baseTime),
      };
    }

    case 'discovery': {
      const apiEvents = [
        generateApiCallEvent({ rng, baseTime, tenantId }),
        generateApiCallEvent({ rng, baseTime: new Date(baseTime.getTime() + 1000), tenantId }),
      ];
      events.push(...apiEvents);
      return {
        tactic,
        technique: 'T1087.004 - Cloud Account Discovery',
        description: 'Enumeration of cloud resources and accounts',
        events,
        timestamp: syntheticTimestamp(baseTime),
      };
    }

    case 'collection': {
      const dnsEvent = generateDnsEvent({ rng, baseTime, tenantId });
      events.push(dnsEvent);
      return {
        tactic,
        technique: 'T1119 - Automated Collection',
        description: 'Automated data collection and staging',
        events,
        timestamp: syntheticTimestamp(baseTime),
      };
    }

    case 'exfiltration': {
      const flowEvent = generateNetworkFlow({ rng, baseTime, tenantId });
      flowEvent.bytesOut = rng.int(10000000, 100000000); // Large outbound transfer
      flowEvent.direction = 'outbound';
      events.push(flowEvent);
      return {
        tactic,
        technique: 'T1048 - Exfiltration Over Alternative Protocol',
        description: 'Large data exfiltration over HTTPS',
        events,
        timestamp: syntheticTimestamp(baseTime),
      };
    }

    default:
      return {
        tactic,
        technique: 'Unknown',
        description: 'Generic campaign step',
        events: [],
        timestamp: syntheticTimestamp(baseTime),
      };
  }
}

/** Generate multiple campaigns */
export function generateCampaigns(
  count: number,
  config: { rng?: SeededRandom; tenantId?: string } = {}
): Campaign[] {
  const rng = config.rng ?? new SeededRandom();
  return Array.from({ length: count }, () =>
    generateCampaign(rng.pick(campaignTemplates), { rng, tenantId: config.tenantId })
  );
}
