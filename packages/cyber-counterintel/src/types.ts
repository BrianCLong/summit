/**
 * Cyber Counterintelligence Types
 *
 * Advanced types for APT tracking, nation-state attribution,
 * and cyber espionage campaign analysis
 */

import { z } from 'zod';

// APT Group Profile
export const APTGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  aliases: z.array(z.string()),
  originCountry: z.string(),
  sponsoringEntity: z.enum(['STATE', 'STATE_AFFILIATED', 'CRIMINAL', 'HACKTIVIST', 'UNKNOWN']),
  firstObserved: z.date(),
  lastActivity: z.date(),
  targetSectors: z.array(z.string()),
  targetCountries: z.array(z.string()),
  sophisticationLevel: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'ELITE']),
  capabilities: z.object({
    malwareDevelopment: z.boolean(),
    zeroDay: z.boolean(),
    supplyChain: z.boolean(),
    socialEngineering: z.boolean(),
    physicalAccess: z.boolean(),
    insiderRecruitment: z.boolean()
  }),
  knownTTPs: z.array(z.object({
    tactic: z.string(),
    technique: z.string(),
    procedure: z.string(),
    mitreId: z.string().optional()
  })),
  infrastructure: z.object({
    knownDomains: z.array(z.string()),
    knownIPs: z.array(z.string()),
    c2Protocols: z.array(z.string()),
    hostingProviders: z.array(z.string())
  }),
  attributionConfidence: z.number().min(0).max(100),
  relatedGroups: z.array(z.string())
});

export type APTGroup = z.infer<typeof APTGroupSchema>;

// Cyber Espionage Campaign
export const CyberCampaignSchema = z.object({
  id: z.string().uuid(),
  campaignName: z.string(),
  attributedActor: z.string().optional(),
  status: z.enum(['ACTIVE', 'DORMANT', 'CONCLUDED', 'DISRUPTED']),
  startDate: z.date(),
  endDate: z.date().optional(),
  objectives: z.array(z.enum([
    'DATA_THEFT',
    'IP_THEFT',
    'ESPIONAGE',
    'SABOTAGE',
    'DISRUPTION',
    'RECONNAISSANCE',
    'CREDENTIAL_HARVESTING',
    'PERSISTENCE'
  ])),
  initialAccess: z.object({
    vector: z.enum([
      'SPEAR_PHISHING',
      'WATERING_HOLE',
      'SUPPLY_CHAIN',
      'ZERO_DAY',
      'CREDENTIAL_STUFFING',
      'VPN_EXPLOIT',
      'RDP_BRUTE_FORCE',
      'INSIDER',
      'PHYSICAL',
      'UNKNOWN'
    ]),
    details: z.string()
  }),
  killChainPhases: z.array(z.object({
    phase: z.enum([
      'RECONNAISSANCE',
      'WEAPONIZATION',
      'DELIVERY',
      'EXPLOITATION',
      'INSTALLATION',
      'COMMAND_CONTROL',
      'ACTIONS_ON_OBJECTIVES'
    ]),
    observed: z.boolean(),
    details: z.string().optional()
  })),
  indicators: z.array(z.object({
    type: z.enum(['IP', 'DOMAIN', 'HASH', 'EMAIL', 'URL', 'MUTEX', 'REGISTRY', 'FILE_PATH']),
    value: z.string(),
    confidence: z.number().min(0).max(100),
    firstSeen: z.date(),
    lastSeen: z.date()
  })),
  malwareUsed: z.array(z.string()),
  targetsCompromised: z.number(),
  dataExfiltrated: z.object({
    detected: z.boolean(),
    volumeGB: z.number().optional(),
    dataTypes: z.array(z.string())
  }),
  responseActions: z.array(z.string())
});

export type CyberCampaign = z.infer<typeof CyberCampaignSchema>;

// Command and Control Infrastructure
export const C2InfrastructureSchema = z.object({
  id: z.string().uuid(),
  discoveredDate: z.date(),
  infrastructure: z.array(z.object({
    type: z.enum(['DOMAIN', 'IP', 'TOR_HIDDEN', 'CLOUD_SERVICE', 'LEGITIMATE_SERVICE']),
    value: z.string(),
    role: z.enum(['PRIMARY_C2', 'BACKUP_C2', 'STAGING', 'EXFIL', 'PROXY']),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SINKHOLED', 'TAKEDOWN']),
    protocol: z.string(),
    port: z.number().optional(),
    encryptionUsed: z.boolean(),
    beaconInterval: z.number().optional()
  })),
  attribution: z.object({
    actorId: z.string().optional(),
    confidence: z.number().min(0).max(100),
    evidence: z.array(z.string())
  }),
  victimConnections: z.number(),
  takedownStatus: z.enum(['NONE', 'REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'])
});

export type C2Infrastructure = z.infer<typeof C2InfrastructureSchema>;

// Malware Analysis
export const MalwareAnalysisSchema = z.object({
  id: z.string().uuid(),
  sampleHash: z.object({
    md5: z.string(),
    sha1: z.string(),
    sha256: z.string()
  }),
  family: z.string(),
  variant: z.string().optional(),
  firstSeen: z.date(),
  lastSeen: z.date(),
  classification: z.enum([
    'RAT',
    'BACKDOOR',
    'RANSOMWARE',
    'WIPER',
    'KEYLOGGER',
    'INFOSTEALER',
    'LOADER',
    'DROPPER',
    'IMPLANT',
    'ROOTKIT',
    'BOOTKIT'
  ]),
  capabilities: z.array(z.string()),
  antiAnalysis: z.array(z.enum([
    'PACKING',
    'ENCRYPTION',
    'OBFUSCATION',
    'VM_DETECTION',
    'SANDBOX_EVASION',
    'ANTI_DEBUG',
    'TIME_BOMB'
  ])),
  persistence: z.array(z.string()),
  c2Protocol: z.string().optional(),
  targetPlatforms: z.array(z.string()),
  associatedActors: z.array(z.string()),
  signatures: z.array(z.object({
    type: z.enum(['YARA', 'SIGMA', 'SNORT', 'SURICATA']),
    rule: z.string()
  }))
});

export type MalwareAnalysis = z.infer<typeof MalwareAnalysisSchema>;

// Zero-Day Tracking
export const ZeroDaySchema = z.object({
  id: z.string().uuid(),
  cve: z.string().optional(),
  discoveredDate: z.date(),
  disclosedDate: z.date().optional(),
  patchedDate: z.date().optional(),
  affectedProduct: z.string(),
  vendor: z.string(),
  vulnerability: z.object({
    type: z.enum([
      'RCE',
      'LPE',
      'MEMORY_CORRUPTION',
      'USE_AFTER_FREE',
      'BUFFER_OVERFLOW',
      'SQL_INJECTION',
      'XSS',
      'SSRF',
      'DESERIALIZATION',
      'AUTH_BYPASS'
    ]),
    cvssScore: z.number().min(0).max(10),
    exploitComplexity: z.enum(['LOW', 'MEDIUM', 'HIGH'])
  }),
  exploitedInWild: z.boolean(),
  attributedActor: z.string().optional(),
  affectedOrganizations: z.array(z.string()),
  mitigation: z.string().optional(),
  status: z.enum(['UNPATCHED', 'PATCH_AVAILABLE', 'PATCHED', 'NO_FIX'])
});

export type ZeroDay = z.infer<typeof ZeroDaySchema>;

// Nation-State Attribution Evidence
export const AttributionEvidenceSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string(),
  subjectType: z.enum(['CAMPAIGN', 'MALWARE', 'INFRASTRUCTURE', 'ACTOR']),
  evidenceType: z.enum([
    'TECHNICAL_ARTIFACT',
    'INFRASTRUCTURE_OVERLAP',
    'MALWARE_CODE_SIMILARITY',
    'TTP_MATCH',
    'VICTIMOLOGY',
    'TIMING_CORRELATION',
    'LANGUAGE_ARTIFACT',
    'OPERATIONAL_ERROR',
    'SIGINT',
    'HUMINT',
    'GEOLOCATION'
  ]),
  evidence: z.string(),
  source: z.string(),
  classification: z.string(),
  weight: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  corroboratedBy: z.array(z.string()),
  counterIndicators: z.array(z.string()),
  analysisDate: z.date(),
  analyst: z.string()
});

export type AttributionEvidence = z.infer<typeof AttributionEvidenceSchema>;

// Digital Forensics Case
export const ForensicsCaseSchema = z.object({
  id: z.string().uuid(),
  caseNumber: z.string(),
  incidentId: z.string(),
  openedDate: z.date(),
  closedDate: z.date().optional(),
  status: z.enum(['ACTIVE', 'ANALYSIS', 'REPORTING', 'CLOSED']),
  classification: z.string(),
  examiner: z.string(),
  evidenceItems: z.array(z.object({
    id: z.string(),
    type: z.enum([
      'DISK_IMAGE',
      'MEMORY_DUMP',
      'NETWORK_CAPTURE',
      'LOG_FILES',
      'MALWARE_SAMPLE',
      'REGISTRY_HIVE',
      'EMAIL',
      'MOBILE_DEVICE'
    ]),
    source: z.string(),
    acquisitionDate: z.date(),
    acquisitionMethod: z.string(),
    hash: z.string(),
    chainOfCustody: z.array(z.object({
      date: z.date(),
      handler: z.string(),
      action: z.string()
    }))
  })),
  findings: z.array(z.object({
    id: z.string(),
    timestamp: z.date(),
    finding: z.string(),
    evidenceSource: z.string(),
    significance: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  })),
  timeline: z.array(z.object({
    timestamp: z.date(),
    event: z.string(),
    source: z.string(),
    significance: z.string()
  })),
  iocs: z.array(z.object({
    type: z.string(),
    value: z.string(),
    context: z.string()
  }))
});

export type ForensicsCase = z.infer<typeof ForensicsCaseSchema>;

// Threat Intelligence Report
export const ThreatIntelReportSchema = z.object({
  id: z.string().uuid(),
  reportNumber: z.string(),
  classification: z.string(),
  title: z.string(),
  publishedDate: z.date(),
  validUntil: z.date(),
  author: z.string(),
  tlp: z.enum(['RED', 'AMBER', 'GREEN', 'WHITE']),
  reportType: z.enum([
    'STRATEGIC',
    'TACTICAL',
    'OPERATIONAL',
    'TECHNICAL',
    'SITUATIONAL'
  ]),
  summary: z.string(),
  keyFindings: z.array(z.string()),
  threatActors: z.array(z.string()),
  campaigns: z.array(z.string()),
  malware: z.array(z.string()),
  vulnerabilities: z.array(z.string()),
  indicators: z.array(z.object({
    type: z.string(),
    value: z.string(),
    context: z.string()
  })),
  recommendations: z.array(z.string()),
  sources: z.array(z.string()),
  relatedReports: z.array(z.string())
});

export type ThreatIntelReport = z.infer<typeof ThreatIntelReportSchema>;
