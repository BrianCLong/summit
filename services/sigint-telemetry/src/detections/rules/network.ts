/**
 * Network Detection Rules
 */

import type { DetectionRule } from '../engine.js';
import type { DnsEvent, NetworkFlow, HttpEvent } from '../../schemas/network.js';

/** DGA domain detection */
const dgaDomainRule: DetectionRule = {
  id: 'network-001',
  name: 'Potential DGA Domain',
  description: 'DNS query for domain with high DGA score',
  severity: 'high',
  enabled: true,
  eventTypes: ['network.dns'],
  mitreTactics: ['command_and_control'],
  mitreTechniques: ['T1568.002'],
  tags: ['network', 'dns', 'dga'],
  evaluate: (event: unknown) => {
    const dnsEvent = event as DnsEvent;
    if (dnsEvent.dgaScore !== undefined && dnsEvent.dgaScore > 0.7) {
      return dnsEvent.dgaScore;
    }
    return null;
  },
};

/** Newly observed domain */
const newDomainRule: DetectionRule = {
  id: 'network-002',
  name: 'Newly Observed Domain',
  description: 'DNS query for domain not seen before',
  severity: 'low',
  enabled: true,
  eventTypes: ['network.dns'],
  mitreTactics: ['command_and_control'],
  mitreTechniques: ['T1071'],
  tags: ['network', 'dns', 'new-domain'],
  evaluate: (event: unknown) => {
    const dnsEvent = event as DnsEvent;
    if (dnsEvent.isNewlyObserved === true) {
      return 0.5;
    }
    return null;
  },
};

/** Large data transfer */
const largeTransferRule: DetectionRule = {
  id: 'network-003',
  name: 'Large Outbound Data Transfer',
  description: 'Unusually large outbound data transfer detected',
  severity: 'medium',
  enabled: true,
  eventTypes: ['network.flow'],
  mitreTactics: ['exfiltration'],
  mitreTechniques: ['T1048'],
  tags: ['network', 'exfiltration', 'data-transfer'],
  evaluate: (event: unknown) => {
    const flowEvent = event as NetworkFlow;
    if (flowEvent.direction === 'outbound' && flowEvent.bytesOut > 10000000) {
      // 10MB threshold
      const confidence = Math.min(0.5 + (flowEvent.bytesOut / 100000000) * 0.4, 0.9);
      return confidence;
    }
    return null;
  },
};

/** Suspicious port usage */
const suspiciousPortRule: DetectionRule = {
  id: 'network-004',
  name: 'Suspicious Port Activity',
  description: 'Connection to commonly abused port',
  severity: 'medium',
  enabled: true,
  eventTypes: ['network.flow'],
  mitreTactics: ['command_and_control', 'lateral_movement'],
  mitreTechniques: ['T1571'],
  tags: ['network', 'ports'],
  evaluate: (event: unknown) => {
    const flowEvent = event as NetworkFlow;
    const suspiciousPorts = [4444, 5555, 6666, 1337, 31337, 8888];
    const destPort = flowEvent.destination?.port;
    if (destPort && suspiciousPorts.includes(destPort)) {
      return 0.7;
    }
    return null;
  },
};

/** HTTP to suspicious status */
const httpErrorSprayRule: DetectionRule = {
  id: 'network-005',
  name: 'HTTP Error Spray',
  description: 'Multiple HTTP 401/403 responses indicating enumeration',
  severity: 'medium',
  enabled: true,
  eventTypes: ['network.http'],
  mitreTactics: ['discovery'],
  mitreTechniques: ['T1083'],
  tags: ['network', 'http', 'enumeration'],
  evaluate: (event: unknown) => {
    const httpEvent = event as HttpEvent;
    if (httpEvent.statusCode === 401 || httpEvent.statusCode === 403) {
      return 0.5;
    }
    return null;
  },
};

/** Denied connection */
const deniedConnectionRule: DetectionRule = {
  id: 'network-006',
  name: 'Blocked Connection Attempt',
  description: 'Connection blocked by firewall or policy',
  severity: 'low',
  enabled: true,
  eventTypes: ['network.flow'],
  mitreTactics: ['lateral_movement'],
  mitreTechniques: ['T1021'],
  tags: ['network', 'firewall', 'blocked'],
  evaluate: (event: unknown) => {
    const flowEvent = event as NetworkFlow;
    if (flowEvent.action === 'deny' || flowEvent.action === 'drop') {
      return 0.4;
    }
    return null;
  },
};

export const networkRules: DetectionRule[] = [
  dgaDomainRule,
  newDomainRule,
  largeTransferRule,
  suspiciousPortRule,
  httpErrorSprayRule,
  deniedConnectionRule,
];
