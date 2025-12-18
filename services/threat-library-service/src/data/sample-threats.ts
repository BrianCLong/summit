/**
 * Sample Threat Data
 *
 * Pre-defined threat archetypes, TTPs, patterns, and indicators for testing
 * and demonstration purposes. This data can be loaded into the repository.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ThreatArchetype,
  TTP,
  PatternTemplate,
  IndicatorPattern,
  GraphMotif,
  Metadata,
} from '../types.js';

// Helper to create metadata
function createMetadata(author: string = 'system'): Metadata {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    createdBy: author,
    updatedAt: now,
    updatedBy: author,
    version: 1,
    changelog: [
      {
        version: 1,
        timestamp: now,
        author,
        description: 'Initial creation',
      },
    ],
  };
}

// ============================================================================
// SAMPLE GRAPH MOTIFS
// ============================================================================

export const lateralMovementMotif: GraphMotif = {
  id: uuidv4(),
  name: 'Lateral Movement Pattern',
  description: 'Detects entity accessing multiple systems in sequence',
  nodes: [
    {
      id: 'actor',
      type: 'THREAT_ACTOR',
      label: 'Threat Actor',
      requiredProperties: ['id'],
    },
    {
      id: 'source_host',
      type: 'ASSET',
      label: 'Compromised Host',
      requiredProperties: ['id', 'hostname'],
    },
    {
      id: 'target_host',
      type: 'ASSET',
      label: 'Target Host',
      requiredProperties: ['id', 'hostname'],
    },
    {
      id: 'credential',
      type: 'INDICATOR',
      label: 'Stolen Credential',
      propertyFilters: [
        { property: 'type', operator: 'EQUALS', value: 'credential' },
      ],
    },
  ],
  edges: [
    {
      id: 'e1',
      sourceNodeId: 'actor',
      targetNodeId: 'source_host',
      type: 'CONTROLS',
      direction: 'OUTGOING',
    },
    {
      id: 'e2',
      sourceNodeId: 'source_host',
      targetNodeId: 'target_host',
      type: 'LATERAL_MOVE_TO',
      direction: 'OUTGOING',
    },
    {
      id: 'e3',
      sourceNodeId: 'actor',
      targetNodeId: 'credential',
      type: 'USES',
      direction: 'OUTGOING',
    },
  ],
  timeConstraints: [
    {
      operator: 'WITHIN',
      referenceNodeId: 'source_host',
      targetNodeId: 'target_host',
      durationMs: 3600000, // 1 hour
    },
  ],
  weight: 0.9,
};

export const c2CommunicationMotif: GraphMotif = {
  id: uuidv4(),
  name: 'C2 Communication Pattern',
  description: 'Detects beaconing behavior to command and control infrastructure',
  nodes: [
    {
      id: 'compromised_host',
      type: 'ASSET',
      label: 'Compromised Host',
      requiredProperties: ['id', 'hostname'],
    },
    {
      id: 'c2_server',
      type: 'INFRASTRUCTURE',
      label: 'C2 Server',
      propertyFilters: [
        { property: 'type', operator: 'EQUALS', value: 'C2' },
      ],
    },
    {
      id: 'malware',
      type: 'MALWARE',
      label: 'Malware',
      requiredProperties: ['family'],
    },
  ],
  edges: [
    {
      id: 'e1',
      sourceNodeId: 'compromised_host',
      targetNodeId: 'c2_server',
      type: 'COMMUNICATES_WITH',
      direction: 'OUTGOING',
    },
    {
      id: 'e2',
      sourceNodeId: 'malware',
      targetNodeId: 'compromised_host',
      type: 'CONTROLS',
      direction: 'OUTGOING',
    },
    {
      id: 'e3',
      sourceNodeId: 'malware',
      targetNodeId: 'c2_server',
      type: 'COMMUNICATES_WITH',
      direction: 'OUTGOING',
    },
  ],
  aggregations: [
    {
      nodeId: 'c2_server',
      property: 'connection_count',
      function: 'COUNT',
      threshold: 10,
    },
  ],
  weight: 0.85,
};

export const dataExfiltrationMotif: GraphMotif = {
  id: uuidv4(),
  name: 'Data Exfiltration Pattern',
  description: 'Detects data being transferred to external destinations',
  nodes: [
    {
      id: 'data_source',
      type: 'ASSET',
      label: 'Data Source',
      propertyFilters: [
        { property: 'classification', operator: 'IN', value: ['CONFIDENTIAL', 'SECRET', 'TOP_SECRET'] },
      ],
    },
    {
      id: 'staging_location',
      type: 'ASSET',
      label: 'Staging Location',
    },
    {
      id: 'external_dest',
      type: 'INFRASTRUCTURE',
      label: 'External Destination',
      propertyFilters: [
        { property: 'external', operator: 'EQUALS', value: true },
      ],
    },
    {
      id: 'actor',
      type: 'THREAT_ACTOR',
      label: 'Threat Actor',
    },
  ],
  edges: [
    {
      id: 'e1',
      sourceNodeId: 'actor',
      targetNodeId: 'data_source',
      type: 'TARGETS',
      direction: 'OUTGOING',
    },
    {
      id: 'e2',
      sourceNodeId: 'data_source',
      targetNodeId: 'staging_location',
      type: 'RELATED_TO',
      direction: 'OUTGOING',
    },
    {
      id: 'e3',
      sourceNodeId: 'staging_location',
      targetNodeId: 'external_dest',
      type: 'EXFILTRATES_TO',
      direction: 'OUTGOING',
    },
  ],
  timeConstraints: [
    {
      operator: 'SEQUENCE',
      sequence: ['data_source', 'staging_location', 'external_dest'],
    },
  ],
  weight: 0.95,
};

// ============================================================================
// SAMPLE TTPS
// ============================================================================

export const sampleTTPs: Omit<TTP, 'id' | 'metadata'>[] = [
  {
    name: 'Spearphishing Attachment',
    description:
      'Adversaries may send spearphishing emails with a malicious attachment to gain access to victim systems.',
    tactic: 'INITIAL_ACCESS',
    techniqueId: 'T1566',
    techniqueName: 'Phishing',
    subTechniqueId: 'T1566.001',
    subTechniqueName: 'Spearphishing Attachment',
    procedures: [
      {
        id: uuidv4(),
        name: 'Malicious Office Document',
        description: 'Send Office document with embedded macro',
        steps: [
          {
            order: 1,
            action: 'Craft malicious document',
            details: 'Create Word/Excel document with VBA macro',
          },
          {
            order: 2,
            action: 'Send email to target',
            details: 'Deliver via spoofed or compromised email account',
          },
          {
            order: 3,
            action: 'User opens document',
            details: 'Macro executes upon document open with user interaction',
          },
        ],
        tools: ['Microsoft Office', 'Email client'],
        detectionNotes: 'Monitor for Office applications spawning child processes',
      },
    ],
    platforms: ['WINDOWS', 'MACOS'],
    dataSources: ['Email', 'File', 'Process'],
    detectionRules: [
      {
        id: uuidv4(),
        name: 'Office Spawning Suspicious Process',
        description: 'Detects Office applications spawning cmd, powershell, or mshta',
        dataSource: 'Process Creation',
        logic:
          'parent_process IN ("winword.exe", "excel.exe") AND process_name IN ("cmd.exe", "powershell.exe", "mshta.exe")',
        format: 'SIGMA',
        falsePositives: ['Legitimate automation macros'],
      },
    ],
    mitreReference: {
      techniqueId: 'T1566.001',
      techniqueName: 'Spearphishing Attachment',
      tacticIds: ['TA0001'],
      mitreUrl: 'https://attack.mitre.org/techniques/T1566/001/',
    },
    severity: 'HIGH',
    prevalence: 'COMMON',
    requiredPrivileges: ['User'],
    defenses: ['User training', 'Email filtering', 'Sandbox analysis'],
    status: 'ACTIVE',
  },
  {
    name: 'Valid Accounts - Domain Accounts',
    description:
      'Adversaries may obtain and abuse credentials of domain accounts to gain Initial Access and move laterally.',
    tactic: 'LATERAL_MOVEMENT',
    techniqueId: 'T1078',
    techniqueName: 'Valid Accounts',
    subTechniqueId: 'T1078.002',
    subTechniqueName: 'Domain Accounts',
    procedures: [
      {
        id: uuidv4(),
        name: 'Pass-the-Hash',
        description: 'Use captured NTLM hashes to authenticate',
        steps: [
          {
            order: 1,
            action: 'Capture NTLM hash',
            details: 'Extract from memory using Mimikatz or similar',
          },
          {
            order: 2,
            action: 'Use hash for authentication',
            details: 'Authenticate to remote system without knowing plaintext password',
          },
        ],
        tools: ['Mimikatz', 'Impacket'],
        detectionNotes: 'Monitor for NTLM authentication without corresponding logon',
      },
    ],
    platforms: ['WINDOWS'],
    dataSources: ['Authentication logs', 'Process creation', 'Network traffic'],
    mitreReference: {
      techniqueId: 'T1078.002',
      techniqueName: 'Domain Accounts',
      tacticIds: ['TA0001', 'TA0003', 'TA0004', 'TA0008'],
      mitreUrl: 'https://attack.mitre.org/techniques/T1078/002/',
    },
    severity: 'CRITICAL',
    prevalence: 'COMMON',
    requiredPrivileges: ['User', 'Administrator'],
    defenses: ['MFA', 'Credential Guard', 'Privileged Access Management'],
    status: 'ACTIVE',
  },
  {
    name: 'Command and Scripting Interpreter - PowerShell',
    description:
      'Adversaries may abuse PowerShell commands and scripts for execution.',
    tactic: 'EXECUTION',
    techniqueId: 'T1059',
    techniqueName: 'Command and Scripting Interpreter',
    subTechniqueId: 'T1059.001',
    subTechniqueName: 'PowerShell',
    procedures: [
      {
        id: uuidv4(),
        name: 'Encoded PowerShell Command',
        description: 'Execute Base64 encoded PowerShell',
        steps: [
          {
            order: 1,
            action: 'Encode payload',
            details: 'Base64 encode malicious PowerShell script',
          },
          {
            order: 2,
            action: 'Execute with -EncodedCommand',
            details: 'Run powershell.exe -EncodedCommand <base64>',
          },
        ],
        tools: ['PowerShell'],
        detectionNotes: 'Monitor for encoded command line parameters',
      },
    ],
    platforms: ['WINDOWS'],
    dataSources: ['Command execution', 'Script execution', 'Process creation'],
    detectionRules: [
      {
        id: uuidv4(),
        name: 'Encoded PowerShell Detection',
        description: 'Detects execution of encoded PowerShell commands',
        dataSource: 'Process Creation',
        logic: 'process_name = "powershell.exe" AND command_line CONTAINS "-enc"',
        format: 'SIGMA',
        falsePositives: ['Some legitimate admin scripts'],
      },
    ],
    mitreReference: {
      techniqueId: 'T1059.001',
      techniqueName: 'PowerShell',
      tacticIds: ['TA0002'],
      mitreUrl: 'https://attack.mitre.org/techniques/T1059/001/',
    },
    severity: 'HIGH',
    prevalence: 'COMMON',
    defenses: ['Script Block Logging', 'Constrained Language Mode', 'AMSI'],
    status: 'ACTIVE',
  },
  {
    name: 'Exfiltration Over C2 Channel',
    description:
      'Adversaries may steal data by exfiltrating it over an existing command and control channel.',
    tactic: 'EXFILTRATION',
    techniqueId: 'T1041',
    techniqueName: 'Exfiltration Over C2 Channel',
    procedures: [
      {
        id: uuidv4(),
        name: 'Cobalt Strike Data Exfiltration',
        description: 'Use Cobalt Strike beacon to exfiltrate data',
        steps: [
          {
            order: 1,
            action: 'Identify target data',
            details: 'Locate sensitive files or databases',
          },
          {
            order: 2,
            action: 'Stage data',
            details: 'Compress and optionally encrypt data',
          },
          {
            order: 3,
            action: 'Exfiltrate via beacon',
            details: 'Send data through existing C2 channel',
          },
        ],
        tools: ['Cobalt Strike'],
        detectionNotes: 'Monitor for large outbound data transfers over C2 protocols',
      },
    ],
    platforms: ['WINDOWS', 'LINUX', 'MACOS'],
    dataSources: ['Network traffic', 'Command execution'],
    mitreReference: {
      techniqueId: 'T1041',
      techniqueName: 'Exfiltration Over C2 Channel',
      tacticIds: ['TA0010'],
      mitreUrl: 'https://attack.mitre.org/techniques/T1041/',
    },
    severity: 'CRITICAL',
    prevalence: 'COMMON',
    defenses: ['DLP', 'Network monitoring', 'Egress filtering'],
    status: 'ACTIVE',
  },
];

// ============================================================================
// SAMPLE INDICATORS
// ============================================================================

export const sampleIndicators: Omit<IndicatorPattern, 'id' | 'metadata'>[] = [
  {
    name: 'Cobalt Strike Default C2 Domain Pattern',
    description: 'Common Cobalt Strike C2 domain naming patterns',
    type: 'DOMAIN',
    pattern: '^[a-z]{5,8}\\.(com|net|org)$',
    patternFormat: 'REGEX',
    confidence: 'MEDIUM',
    severity: 'HIGH',
    validFrom: new Date().toISOString(),
    killChainPhases: ['COMMAND_AND_CONTROL'],
    tags: ['cobalt-strike', 'c2'],
    status: 'ACTIVE',
  },
  {
    name: 'Suspicious PowerShell Download Cradle',
    description: 'PowerShell command patterns used for downloading and executing payloads',
    type: 'BEHAVIOR',
    pattern:
      'IEX\\s*\\(\\s*(New-Object\\s+Net\\.WebClient\\)\\.DownloadString|\\(Invoke-WebRequest|iwr\\s)',
    patternFormat: 'REGEX',
    confidence: 'HIGH',
    severity: 'HIGH',
    validFrom: new Date().toISOString(),
    killChainPhases: ['EXECUTION', 'COMMAND_AND_CONTROL'],
    tags: ['powershell', 'download-cradle'],
    status: 'ACTIVE',
  },
  {
    name: 'Mimikatz Process Creation',
    description: 'Detection of Mimikatz or similar credential dumping tools',
    type: 'TOOL_SIGNATURE',
    pattern: 'mimikatz|sekurlsa|kerberos::',
    patternFormat: 'REGEX',
    confidence: 'HIGH',
    severity: 'CRITICAL',
    validFrom: new Date().toISOString(),
    killChainPhases: ['CREDENTIAL_ACCESS'],
    tags: ['mimikatz', 'credential-theft'],
    status: 'ACTIVE',
  },
  {
    name: 'Known APT C2 IP Range',
    description: 'IP ranges associated with known APT infrastructure',
    type: 'CIDR',
    pattern: '185.141.62.0/24',
    patternFormat: 'LITERAL',
    confidence: 'HIGH',
    severity: 'CRITICAL',
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    killChainPhases: ['COMMAND_AND_CONTROL'],
    tags: ['apt', 'c2', 'infrastructure'],
    status: 'ACTIVE',
  },
];

// ============================================================================
// SAMPLE THREAT ARCHETYPES
// ============================================================================

export function createSampleThreatArchetype(
  ttpIds: string[],
  patternIds: string[],
  indicatorIds: string[]
): Omit<ThreatArchetype, 'id' | 'metadata'> {
  return {
    name: 'APT-Style Cyber Espionage Campaign',
    aliases: ['Advanced Persistent Threat', 'State-Sponsored Attack'],
    description:
      'A sophisticated, multi-stage attack campaign typically associated with nation-state actors. Characterized by long dwell times, lateral movement, and targeted data exfiltration.',
    summary:
      'Advanced persistent threat campaign targeting sensitive data with sophisticated techniques',
    sophistication: 'EXPERT',
    motivation: ['ESPIONAGE'],
    targetSectors: ['GOVERNMENT', 'DEFENSE', 'TECHNOLOGY', 'FINANCIAL'],
    targetRegions: ['North America', 'Western Europe', 'Asia Pacific'],
    typicalTTPs: ttpIds,
    patternTemplates: patternIds,
    indicators: indicatorIds,
    relatedArchetypes: [],
    knownActors: ['APT29', 'APT28', 'Lazarus Group'],
    historicalCampaigns: ['SolarWinds', 'NotPetya', 'Operation Cloud Hopper'],
    externalReferences: [
      {
        source: 'MITRE ATT&CK',
        externalId: 'G0016',
        url: 'https://attack.mitre.org/groups/G0016/',
        description: 'APT29 threat group',
      },
    ],
    mitreReferences: [
      {
        techniqueId: 'T1566.001',
        techniqueName: 'Spearphishing Attachment',
        tacticIds: ['TA0001'],
        mitreUrl: 'https://attack.mitre.org/techniques/T1566/001/',
      },
    ],
    countermeasures: [
      {
        id: 'cm1',
        name: 'Network Segmentation',
        description:
          'Implement network segmentation to limit lateral movement',
        effectiveness: 'HIGH',
      },
      {
        id: 'cm2',
        name: 'Endpoint Detection and Response',
        description: 'Deploy EDR solutions for advanced threat detection',
        effectiveness: 'HIGH',
      },
      {
        id: 'cm3',
        name: 'Security Awareness Training',
        description: 'Train users to identify phishing attempts',
        effectiveness: 'MEDIUM',
      },
    ],
    riskScore: 95,
    prevalence: 'UNCOMMON',
    active: true,
    status: 'ACTIVE',
  };
}

export function createSamplePatternTemplate(
  motifs: GraphMotif[],
  ttpIds: string[],
  indicatorIds: string[]
): Omit<PatternTemplate, 'id' | 'metadata'> {
  return {
    name: 'APT Lateral Movement and Exfiltration Pattern',
    description:
      'Detects the combination of lateral movement and data exfiltration indicative of APT activity',
    category: 'DATA_EXFILTRATION',
    graphMotifs: motifs,
    signals: [
      {
        id: uuidv4(),
        name: 'High Volume Data Transfer',
        description: 'Detects unusually high volume data transfers',
        signalType: 'THRESHOLD',
        dataSource: 'Network Flow',
        metric: 'bytes_transferred',
        baseline: 1000000,
        threshold: 100000000, // 100MB
        operator: 'GT',
        windowMs: 3600000, // 1 hour
      },
      {
        id: uuidv4(),
        name: 'Multiple Host Access',
        description: 'Detects single account accessing multiple hosts',
        signalType: 'STATISTICAL',
        dataSource: 'Authentication',
        metric: 'unique_hosts_accessed',
        threshold: 5,
        operator: 'GT',
        windowMs: 86400000, // 24 hours
        aggregation: 'COUNT',
      },
    ],
    indicators: indicatorIds,
    ttps: ttpIds,
    requiredMotifMatches: 1,
    requiredSignalMatches: 1,
    confidenceFormula: '(motif_score * 0.6) + (signal_score * 0.3) + (indicator_score * 0.1)',
    severity: 'CRITICAL',
    tags: ['apt', 'espionage', 'exfiltration'],
    applicableSectors: ['GOVERNMENT', 'DEFENSE', 'FINANCIAL'],
    status: 'ACTIVE',
  };
}
