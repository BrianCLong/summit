"use strict";
/**
 * Attack Campaign Generator
 *
 * Generates synthetic attack campaigns for blue team simulation.
 * Models ATT&CK-style TTP chains on synthetic infrastructure.
 *
 * IMPORTANT: This is SIMULATION ONLY for defensive testing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignTemplates = void 0;
exports.generateCampaign = generateCampaign;
exports.generateCampaigns = generateCampaigns;
const uuid_1 = require("uuid");
const utils_js_1 = require("./utils.js");
const identity_js_1 = require("./identity.js");
const endpoint_js_1 = require("./endpoint.js");
const network_js_1 = require("./network.js");
const cloud_js_1 = require("./cloud.js");
/** Predefined campaign templates */
exports.campaignTemplates = [
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
function generateCampaign(template, config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    const startTime = new Date(Date.now() - rng.int(3600000, 86400000));
    const steps = [];
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
        id: (0, uuid_1.v4)(),
        name: template.name,
        description: template.description,
        startTime: startTime.toISOString(),
        endTime: currentTime.toISOString(),
        steps,
        isSynthetic: true,
    };
}
/** Generate events for a campaign step */
function generateCampaignStep(tactic, config) {
    const { rng, baseTime, tenantId } = config;
    const events = [];
    switch (tactic) {
        case 'initial_access': {
            // Suspicious auth from unusual location
            const authEvent = (0, identity_js_1.generateAuthEvent)({ rng, baseTime, tenantId });
            authEvent.impossibleTravel = true;
            authEvent.riskScore = rng.int(70, 95);
            events.push(authEvent);
            return {
                tactic,
                technique: 'T1078 - Valid Accounts',
                description: 'Initial access via compromised credentials from unusual location',
                events,
                timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
            };
        }
        case 'execution': {
            const procEvent = (0, endpoint_js_1.generateProcessEvent)({ rng, baseTime, tenantId });
            procEvent.processName = 'powershell.exe';
            procEvent.isElevated = true;
            events.push(procEvent);
            return {
                tactic,
                technique: 'T1059.001 - PowerShell',
                description: 'Execution of encoded PowerShell command',
                events,
                timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
            };
        }
        case 'credential_access': {
            const alert = (0, endpoint_js_1.generateEdrAlert)({ rng, baseTime, tenantId });
            alert.alertName = 'LSASS Memory Access';
            alert.mitreTechniques = ['T1003.001'];
            alert.severity = 'critical';
            events.push(alert);
            return {
                tactic,
                technique: 'T1003.001 - LSASS Memory',
                description: 'Attempted credential dumping from LSASS',
                events,
                timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
            };
        }
        case 'lateral_movement': {
            const flowEvent = (0, network_js_1.generateNetworkFlow)({ rng, baseTime, tenantId });
            flowEvent.destination.port = 3389;
            flowEvent.direction = 'lateral';
            events.push(flowEvent);
            return {
                tactic,
                technique: 'T1021.001 - Remote Desktop Protocol',
                description: 'Lateral movement via RDP to internal host',
                events,
                timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
            };
        }
        case 'privilege_escalation': {
            const iamEvent = (0, cloud_js_1.generateIamEvent)({ rng, baseTime, tenantId });
            iamEvent.action = 'policy_attached';
            events.push(iamEvent);
            return {
                tactic,
                technique: 'T1078.004 - Cloud Accounts',
                description: 'Privilege escalation via IAM policy attachment',
                events,
                timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
            };
        }
        case 'discovery': {
            const apiEvents = [
                (0, cloud_js_1.generateApiCallEvent)({ rng, baseTime, tenantId }),
                (0, cloud_js_1.generateApiCallEvent)({ rng, baseTime: new Date(baseTime.getTime() + 1000), tenantId }),
            ];
            events.push(...apiEvents);
            return {
                tactic,
                technique: 'T1087.004 - Cloud Account Discovery',
                description: 'Enumeration of cloud resources and accounts',
                events,
                timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
            };
        }
        case 'collection': {
            const dnsEvent = (0, network_js_1.generateDnsEvent)({ rng, baseTime, tenantId });
            events.push(dnsEvent);
            return {
                tactic,
                technique: 'T1119 - Automated Collection',
                description: 'Automated data collection and staging',
                events,
                timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
            };
        }
        case 'exfiltration': {
            const flowEvent = (0, network_js_1.generateNetworkFlow)({ rng, baseTime, tenantId });
            flowEvent.bytesOut = rng.int(10000000, 100000000); // Large outbound transfer
            flowEvent.direction = 'outbound';
            events.push(flowEvent);
            return {
                tactic,
                technique: 'T1048 - Exfiltration Over Alternative Protocol',
                description: 'Large data exfiltration over HTTPS',
                events,
                timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
            };
        }
        default:
            return {
                tactic,
                technique: 'Unknown',
                description: 'Generic campaign step',
                events: [],
                timestamp: (0, utils_js_1.syntheticTimestamp)(baseTime),
            };
    }
}
/** Generate multiple campaigns */
function generateCampaigns(count, config = {}) {
    const rng = config.rng ?? new utils_js_1.SeededRandom();
    return Array.from({ length: count }, () => generateCampaign(rng.pick(exports.campaignTemplates), { rng, tenantId: config.tenantId }));
}
