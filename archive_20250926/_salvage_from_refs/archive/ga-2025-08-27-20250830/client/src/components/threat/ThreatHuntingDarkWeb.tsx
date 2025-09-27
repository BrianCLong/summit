import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ThreatHuntingDarkWeb.css';

// Threat Hunting Interfaces
interface ThreatHunt {
  id: string;
  name: string;
  description: string;
  type: 'proactive' | 'reactive' | 'continuous' | 'intelligence_driven' | 'anomaly_based';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  hypothesis: string;
  tactics: string[]; // MITRE ATT&CK tactics
  techniques: string[]; // MITRE ATT&CK techniques
  iocs: Array<{
    type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'file' | 'registry' | 'process';
    value: string;
    confidence: number;
    source: string;
    firstSeen: Date;
    lastSeen: Date;
  }>;
  queries: Array<{
    id: string;
    name: string;
    query: string;
    platform: 'splunk' | 'elastic' | 'sigma' | 'kql' | 'sql' | 'yara' | 'custom';
    schedule: string;
    enabled: boolean;
    lastRun?: Date;
    results?: number;
  }>;
  findings: Array<{
    id: string;
    timestamp: Date;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    evidence: string[];
    falsePositive: boolean;
    analyst: string;
    notes?: string;
  }>;
  timeline: {
    created: Date;
    started?: Date;
    lastActivity?: Date;
    completed?: Date;
  };
  assignedTo: string;
  tags: string[];
  metadata: Record<string, any>;
}

interface DarkWebMonitoring {
  id: string;
  name: string;
  description: string;
  type: 'keyword_monitoring' | 'brand_monitoring' | 'credential_monitoring' | 'threat_actor_tracking' | 'marketplace_surveillance';
  status: 'active' | 'paused' | 'completed' | 'error';
  targets: Array<{
    type: 'keyword' | 'domain' | 'email' | 'username' | 'brand' | 'product';
    value: string;
    sensitivity: 'exact' | 'fuzzy' | 'regex';
    variations: string[];
  }>;
  sources: Array<{
    type: 'forum' | 'marketplace' | 'chat' | 'social' | 'paste_site' | 'leak_site' | 'telegram' | 'discord';
    name: string;
    url?: string;
    accessLevel: 'surface' | 'deep' | 'dark';
    credentialsRequired: boolean;
    lastScanned?: Date;
    enabled: boolean;
  }>;
  alerts: Array<{
    id: string;
    timestamp: Date;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    title: string;
    summary: string;
    source: string;
    url?: string;
    content: string;
    matched_targets: string[];
    screenshot?: string;
    false_positive: boolean;
    investigated: boolean;
    analyst?: string;
    notes?: string;
  }>;
  schedule: {
    frequency: 'continuous' | 'hourly' | 'daily' | 'weekly';
    nextRun?: Date;
    lastRun?: Date;
  };
  created: Date;
  assignedTo: string;
  tags: string[];
}

interface ThreatIntelligence {
  id: string;
  type: 'apt' | 'malware' | 'vulnerability' | 'campaign' | 'actor' | 'infrastructure' | 'tactic';
  name: string;
  description: string;
  confidence: number; // 0-100
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  tlp: 'white' | 'green' | 'amber' | 'red'; // Traffic Light Protocol
  sources: Array<{
    name: string;
    type: 'commercial' | 'open_source' | 'government' | 'community' | 'internal';
    reliability: 'A' | 'B' | 'C' | 'D' | 'E'; // Source reliability
    url?: string;
  }>;
  iocs: Array<{
    type: string;
    value: string;
    confidence: number;
    context?: string;
  }>;
  attribution: {
    actors: string[];
    groups: string[];
    countries: string[];
    confidence: number;
  };
  killChain: Array<{
    phase: string;
    techniques: string[];
  }>;
  timeline: {
    first_observed: Date;
    last_observed: Date;
    created: Date;
    updated: Date;
  };
  tags: string[];
  related_intel: string[];
}

interface HuntingRule {
  id: string;
  name: string;
  description: string;
  category: 'detection' | 'hunting' | 'prevention' | 'response';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  rule_type: 'sigma' | 'yara' | 'snort' | 'suricata' | 'splunk' | 'elastic' | 'custom';
  rule_content: string;
  mitre_tactics: string[];
  mitre_techniques: string[];
  false_positive_rate: number; // 0-100
  detection_rate: number; // 0-100
  performance_impact: 'low' | 'medium' | 'high';
  enabled: boolean;
  created: Date;
  updated: Date;
  author: string;
  version: string;
  references: string[];
  tags: string[];
}

interface ThreatHuntingDarkWebProps {
  investigationId?: string;
  onHuntingResultFound?: (result: any) => void;
  onDarkWebAlertTriggered?: (alert: any) => void;
  onThreatIntelUpdate?: (intel: ThreatIntelligence) => void;
  onRuleTriggered?: (rule: HuntingRule, matches: any[]) => void;
}

const ThreatHuntingDarkWeb: React.FC<ThreatHuntingDarkWebProps> = ({
  investigationId,
  onHuntingResultFound,
  onDarkWebAlertTriggered,
  onThreatIntelUpdate,
  onRuleTriggered
}) => {
  // State Management
  const [threatHunts, setThreatHunts] = useState<ThreatHunt[]>([]);
  const [darkWebMonitoring, setDarkWebMonitoring] = useState<DarkWebMonitoring[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelligence[]>([]);
  const [huntingRules, setHuntingRules] = useState<HuntingRule[]>([]);
  const [selectedHunt, setSelectedHunt] = useState<ThreatHunt | null>(null);
  const [selectedMonitoring, setSelectedMonitoring] = useState<DarkWebMonitoring | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'hunts' | 'darkweb' | 'intel' | 'rules' | 'dashboard'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Modal States
  const [showNewHuntModal, setShowNewHuntModal] = useState(false);
  const [showNewMonitoringModal, setShowNewMonitoringModal] = useState(false);
  const [isRunningHunt, setIsRunningHunt] = useState(false);

  // Generate Mock Data
  const generateMockData = useCallback(() => {
    const mockHunts: ThreatHunt[] = [
      {
        id: 'hunt-001',
        name: 'APT29 Cozy Bear Campaign Detection',
        description: 'Proactive hunt for indicators and TTPs associated with APT29 group targeting government entities',
        type: 'intelligence_driven',
        status: 'active',
        priority: 'high',
        hypothesis: 'APT29 may be using new spear-phishing techniques with COVID-19 themed lures to target government employees',
        tactics: ['T1566', 'T1059', 'T1053', 'T1055'],
        techniques: ['T1566.001', 'T1059.001', 'T1053.005', 'T1055.012'],
        iocs: [
          {
            type: 'domain', value: 'covidinfo-gov.com', confidence: 85,
            source: 'Commercial Intel', firstSeen: new Date('2024-01-15'), lastSeen: new Date('2024-01-25')
          },
          {
            type: 'hash', value: 'a1b2c3d4e5f6789012345678901234567890abcd', confidence: 92,
            source: 'Internal Analysis', firstSeen: new Date('2024-01-18'), lastSeen: new Date('2024-01-24')
          },
          {
            type: 'ip', value: '192.168.1.100', confidence: 78,
            source: 'Threat Feed', firstSeen: new Date('2024-01-20'), lastSeen: new Date('2024-01-26')
          }
        ],
        queries: [
          {
            id: 'q1', name: 'Suspicious Email Attachments', 
            query: 'index=email attachment_type="*.exe" OR attachment_type="*.scr" sender_domain="*covid*"',
            platform: 'splunk', schedule: '*/15 * * * *', enabled: true,
            lastRun: new Date('2024-01-26T10:30:00'), results: 3
          },
          {
            id: 'q2', name: 'PowerShell Execution Patterns',
            query: 'process_name="powershell.exe" command_line="*-enc*" OR command_line="*-e*"',
            platform: 'elastic', schedule: '*/30 * * * *', enabled: true,
            lastRun: new Date('2024-01-26T10:45:00'), results: 12
          }
        ],
        findings: [
          {
            id: 'f1', timestamp: new Date('2024-01-25T14:30:00'), severity: 'high',
            title: 'Suspicious PowerShell execution detected',
            description: 'Encoded PowerShell command executed from email attachment',
            evidence: ['process_logs.txt', 'email_metadata.json'],
            falsePositive: false, analyst: 'John Smith',
            notes: 'Confirmed malicious - escalating to incident response'
          }
        ],
        timeline: {
          created: new Date('2024-01-10'),
          started: new Date('2024-01-12'),
          lastActivity: new Date('2024-01-25')
        },
        assignedTo: 'Sarah Johnson',
        tags: ['apt29', 'spear_phishing', 'government_targeting'],
        metadata: { priority_justification: 'Nation-state actor with history of government targeting' }
      },
      {
        id: 'hunt-002',
        name: 'Cryptocurrency Mining Malware Hunt',
        description: 'Detection of unauthorized cryptocurrency mining activities on corporate network',
        type: 'anomaly_based',
        status: 'active',
        priority: 'medium',
        hypothesis: 'Employees may have inadvertently installed cryptomining malware through compromised websites or software',
        tactics: ['T1496', 'T1055', 'T1112'],
        techniques: ['T1496', 'T1055.001', 'T1112'],
        iocs: [
          {
            type: 'process', value: 'xmrig.exe', confidence: 95,
            source: 'Malware Analysis', firstSeen: new Date('2024-01-20'), lastSeen: new Date('2024-01-26')
          },
          {
            type: 'domain', value: 'pool.minergate.com', confidence: 88,
            source: 'Network Analysis', firstSeen: new Date('2024-01-22'), lastSeen: new Date('2024-01-26')
          }
        ],
        queries: [
          {
            id: 'q3', name: 'High CPU Usage Processes',
            query: 'cpu_usage>80 process_name!="known_heavy_processes"',
            platform: 'elastic', schedule: '0 */2 * * *', enabled: true,
            lastRun: new Date('2024-01-26T10:00:00'), results: 8
          },
          {
            id: 'q4', name: 'Mining Pool Connections',
            query: 'destination_port=4444 OR destination_port=3333 OR destination_port=8080 mining_pool_indicators',
            platform: 'splunk', schedule: '*/20 * * * *', enabled: true,
            lastRun: new Date('2024-01-26T10:20:00'), results: 2
          }
        ],
        findings: [
          {
            id: 'f2', timestamp: new Date('2024-01-24T16:15:00'), severity: 'medium',
            title: 'Suspicious high CPU usage detected',
            description: 'Unknown process consuming 95% CPU resources continuously',
            evidence: ['system_performance.log', 'process_analysis.txt'],
            falsePositive: false, analyst: 'Mike Chen',
            notes: 'Investigating process origin and network connections'
          }
        ],
        timeline: {
          created: new Date('2024-01-18'),
          started: new Date('2024-01-20'),
          lastActivity: new Date('2024-01-24')
        },
        assignedTo: 'Mike Chen',
        tags: ['cryptomining', 'malware', 'resource_abuse'],
        metadata: { estimated_daily_cost: '$150', affected_systems: 12 }
      }
    ];

    const mockDarkWeb: DarkWebMonitoring[] = [
      {
        id: 'dw-001',
        name: 'Corporate Brand Monitoring',
        description: 'Monitor dark web forums and marketplaces for mentions of company brand and leaked credentials',
        type: 'brand_monitoring',
        status: 'active',
        targets: [
          { type: 'brand', value: 'IntelGraph', sensitivity: 'fuzzy', variations: ['Intel Graph', 'intelgraph', 'intel-graph'] },
          { type: 'domain', value: 'intelgraph.com', sensitivity: 'exact', variations: [] },
          { type: 'keyword', value: 'employee database', sensitivity: 'fuzzy', variations: ['emp database', 'staff db'] }
        ],
        sources: [
          {
            type: 'forum', name: 'RaidForums', url: 'raidforums.com',
            accessLevel: 'dark', credentialsRequired: true, lastScanned: new Date('2024-01-26T08:00:00'), enabled: true
          },
          {
            type: 'marketplace', name: 'DarkBay', url: 'darkbay.onion',
            accessLevel: 'dark', credentialsRequired: true, lastScanned: new Date('2024-01-26T06:30:00'), enabled: true
          },
          {
            type: 'paste_site', name: 'Pastebin', url: 'pastebin.com',
            accessLevel: 'surface', credentialsRequired: false, lastScanned: new Date('2024-01-26T09:15:00'), enabled: true
          },
          {
            type: 'telegram', name: 'Data Breach Channels',
            accessLevel: 'deep', credentialsRequired: false, lastScanned: new Date('2024-01-26T07:45:00'), enabled: true
          }
        ],
        alerts: [
          {
            id: 'alert-001', timestamp: new Date('2024-01-24T15:30:00'), severity: 'high',
            title: 'IntelGraph Employee Credentials Found',
            summary: 'Database dump containing employee email addresses and password hashes discovered on RaidForums',
            source: 'RaidForums', url: 'raidforums.com/thread/12345',
            content: 'Posted by user "DataHunter": Fresh corp dump - IntelGraph employees, 1,247 records including emails, hashed passwords, and department info. Looking for $2000 BTC.',
            matched_targets: ['IntelGraph', 'intelgraph.com'],
            screenshot: 'screenshots/raidforums_12345.png',
            false_positive: false, investigated: false
          },
          {
            id: 'alert-002', timestamp: new Date('2024-01-23T22:15:00'), severity: 'medium',
            title: 'Brand Mention in Underground Chat',
            summary: 'Discussion about targeting IntelGraph systems found in encrypted chat channel',
            source: 'Telegram Channel', 
            content: 'User discussing potential attack vectors against IntelGraph infrastructure. Mentions recent vulnerabilities in their stack.',
            matched_targets: ['IntelGraph'],
            false_positive: false, investigated: true, analyst: 'Lisa Wilson',
            notes: 'Generic discussion - no specific actionable threats identified'
          }
        ],
        schedule: {
          frequency: 'hourly',
          nextRun: new Date('2024-01-26T11:00:00'),
          lastRun: new Date('2024-01-26T10:00:00')
        },
        created: new Date('2024-01-05'),
        assignedTo: 'Lisa Wilson',
        tags: ['brand_protection', 'credential_monitoring', 'corporate_security']
      },
      {
        id: 'dw-002',
        name: 'Executive Protection Monitoring',
        description: 'Monitor for threats, doxxing, or personal information exposure of C-level executives',
        type: 'credential_monitoring',
        status: 'active',
        targets: [
          { type: 'email', value: 'ceo@intelgraph.com', sensitivity: 'exact', variations: [] },
          { type: 'username', value: 'johndoe_ceo', sensitivity: 'fuzzy', variations: ['john.doe', 'j.doe'] },
          { type: 'keyword', value: 'IntelGraph CEO', sensitivity: 'fuzzy', variations: ['CEO of IntelGraph', 'IntelGraph chief'] }
        ],
        sources: [
          {
            type: 'forum', name: 'Various Hacker Forums',
            accessLevel: 'dark', credentialsRequired: true, lastScanned: new Date('2024-01-26T07:00:00'), enabled: true
          },
          {
            type: 'social', name: 'Twitter/X Monitoring',
            accessLevel: 'surface', credentialsRequired: false, lastScanned: new Date('2024-01-26T08:30:00'), enabled: true
          },
          {
            type: 'leak_site', name: 'Data Breach Sites',
            accessLevel: 'deep', credentialsRequired: false, lastScanned: new Date('2024-01-26T06:00:00'), enabled: true
          }
        ],
        alerts: [
          {
            id: 'alert-003', timestamp: new Date('2024-01-22T11:45:00'), severity: 'critical',
            title: 'Executive Personal Information Exposed',
            summary: 'CEO personal email and phone number found in data breach dump',
            source: 'BreachForums',
            content: 'LinkedIn data breach includes CEO personal details: personal email, phone, home address. Posted in public section.',
            matched_targets: ['ceo@intelgraph.com', 'johndoe_ceo'],
            false_positive: false, investigated: true, analyst: 'David Rodriguez',
            notes: 'Confirmed legitimate breach - CEO has been notified, security measures implemented'
          }
        ],
        schedule: {
          frequency: 'continuous',
          nextRun: new Date('2024-01-26T10:30:00'),
          lastRun: new Date('2024-01-26T10:15:00')
        },
        created: new Date('2023-12-01'),
        assignedTo: 'David Rodriguez',
        tags: ['executive_protection', 'vip_monitoring', 'personal_security']
      }
    ];

    const mockIntel: ThreatIntelligence[] = [
      {
        id: 'intel-001',
        type: 'apt',
        name: 'APT29 (Cozy Bear) - Recent Campaign',
        description: 'Russian state-sponsored group targeting government and private sector with sophisticated spear-phishing campaigns',
        confidence: 90,
        severity: 'critical',
        tlp: 'amber',
        sources: [
          { name: 'FireEye', type: 'commercial', reliability: 'A', url: 'https://fireeye.com/apt29-report' },
          { name: 'MITRE ATT&CK', type: 'open_source', reliability: 'A', url: 'https://attack.mitre.org/groups/G0016/' },
          { name: 'Internal Analysis', type: 'internal', reliability: 'B' }
        ],
        iocs: [
          { type: 'domain', value: 'covidinfo-gov.com', confidence: 85, context: 'C2 domain for COVID-themed campaign' },
          { type: 'hash', value: 'a1b2c3d4e5f6789012345678901234567890abcd', confidence: 92, context: 'Malicious Word document hash' },
          { type: 'ip', value: '185.225.19.42', confidence: 78, context: 'Command and control server' }
        ],
        attribution: {
          actors: ['APT29', 'Cozy Bear', 'The Dukes'],
          groups: ['SVR RF'],
          countries: ['Russia'],
          confidence: 85
        },
        killChain: [
          { phase: 'Reconnaissance', techniques: ['T1589', 'T1590'] },
          { phase: 'Initial Access', techniques: ['T1566.001'] },
          { phase: 'Execution', techniques: ['T1059.001', 'T1059.005'] },
          { phase: 'Persistence', techniques: ['T1053.005'] },
          { phase: 'Command and Control', techniques: ['T1071.001'] }
        ],
        timeline: {
          first_observed: new Date('2023-11-15'),
          last_observed: new Date('2024-01-25'),
          created: new Date('2024-01-10'),
          updated: new Date('2024-01-25')
        },
        tags: ['apt29', 'russia', 'government_targeting', 'spear_phishing'],
        related_intel: ['intel-002', 'intel-003']
      },
      {
        id: 'intel-002',
        type: 'malware',
        name: 'WellMess Backdoor - Latest Variant',
        description: 'Sophisticated backdoor malware used by APT29 with enhanced evasion capabilities',
        confidence: 88,
        severity: 'high',
        tlp: 'green',
        sources: [
          { name: 'Kaspersky', type: 'commercial', reliability: 'A' },
          { name: 'VirusTotal', type: 'community', reliability: 'B' }
        ],
        iocs: [
          { type: 'hash', value: 'b2c3d4e5f67890123456789012345678901abcde', confidence: 95, context: 'WellMess variant 3.2' },
          { type: 'registry', value: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\SystemUpdate', confidence: 90, context: 'Persistence mechanism' }
        ],
        attribution: {
          actors: ['APT29'],
          groups: ['Cozy Bear'],
          countries: ['Russia'],
          confidence: 75
        },
        killChain: [
          { phase: 'Defense Evasion', techniques: ['T1055', 'T1027'] },
          { phase: 'Persistence', techniques: ['T1547.001'] },
          { phase: 'Collection', techniques: ['T1005', 'T1113'] }
        ],
        timeline: {
          first_observed: new Date('2024-01-01'),
          last_observed: new Date('2024-01-26'),
          created: new Date('2024-01-15'),
          updated: new Date('2024-01-26')
        },
        tags: ['wellmess', 'backdoor', 'apt29', 'evasion'],
        related_intel: ['intel-001']
      }
    ];

    const mockRules: HuntingRule[] = [
      {
        id: 'rule-001',
        name: 'Suspicious PowerShell Execution',
        description: 'Detects potentially malicious PowerShell commands with encoding or obfuscation',
        category: 'detection',
        severity: 'medium',
        rule_type: 'sigma',
        rule_content: `title: Suspicious PowerShell Command Execution
description: Detects suspicious PowerShell command execution with encoding
logsource:
  product: windows
  service: powershell
detection:
  selection:
    EventID: 4103
    Message|contains:
      - '-enc'
      - '-encoded'
      - 'FromBase64String'
      - 'DownloadString'
  condition: selection
fields:
  - CommandLine
  - User
  - ComputerName
falsepositives:
  - Administrative scripts
level: medium`,
        mitre_tactics: ['T1059'],
        mitre_techniques: ['T1059.001'],
        false_positive_rate: 15,
        detection_rate: 85,
        performance_impact: 'low',
        enabled: true,
        created: new Date('2024-01-10'),
        updated: new Date('2024-01-20'),
        author: 'Sarah Johnson',
        version: '1.2',
        references: [
          'https://attack.mitre.org/techniques/T1059/001/',
          'https://github.com/SigmaHQ/sigma/blob/master/rules/windows/powershell/'
        ],
        tags: ['powershell', 'execution', 'encoding', 'sigma']
      },
      {
        id: 'rule-002',
        name: 'Cryptocurrency Miner Detection',
        description: 'Identifies potential cryptocurrency mining activities based on process behavior',
        category: 'hunting',
        severity: 'medium',
        rule_type: 'yara',
        rule_content: `rule Crypto_Miner_Detection
{
    meta:
        description = "Detects cryptocurrency mining malware"
        author = "Mike Chen"
        date = "2024-01-18"
        version = "1.0"
        
    strings:
        $mining1 = "stratum+tcp://" ascii wide
        $mining2 = "mining.pool" ascii wide
        $mining3 = "xmrig" ascii wide nocase
        $mining4 = "cpuminer" ascii wide nocase
        $mining5 = "cgminer" ascii wide nocase
        
        $crypto1 = "monero" ascii wide nocase
        $crypto2 = "bitcoin" ascii wide nocase
        $crypto3 = "ethereum" ascii wide nocase
        
    condition:
        (any of ($mining*) and any of ($crypto*)) or
        (#mining3 > 0 or #mining4 > 0 or #mining5 > 0)
}`,
        mitre_tactics: ['T1496'],
        mitre_techniques: ['T1496'],
        false_positive_rate: 5,
        detection_rate: 92,
        performance_impact: 'medium',
        enabled: true,
        created: new Date('2024-01-18'),
        updated: new Date('2024-01-25'),
        author: 'Mike Chen',
        version: '1.0',
        references: [
          'https://attack.mitre.org/techniques/T1496/',
          'https://github.com/Yara-Rules/rules/tree/master/malware'
        ],
        tags: ['cryptocurrency', 'mining', 'malware', 'yara']
      }
    ];

    setThreatHunts(mockHunts);
    setDarkWebMonitoring(mockDarkWeb);
    setThreatIntel(mockIntel);
    setHuntingRules(mockRules);
  }, []);

  // Initialize data
  useEffect(() => {
    if (threatHunts.length === 0) {
      generateMockData();
    }
  }, [generateMockData, threatHunts.length]);

  // Run Threat Hunt
  const runThreatHunt = useCallback(async (huntId: string) => {
    setIsRunningHunt(true);
    
    // Simulate hunt execution
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update hunt status and add mock findings
    setThreatHunts(prev => prev.map(hunt => {
      if (hunt.id === huntId) {
        const newFinding = {
          id: `finding-${Date.now()}`,
          timestamp: new Date(),
          severity: 'medium' as const,
          title: 'New suspicious activity detected',
          description: 'Automated hunt detected anomalous behavior matching threat indicators',
          evidence: ['hunt_results.json', 'system_logs.txt'],
          falsePositive: false,
          analyst: 'Automated Hunt',
          notes: 'Requires manual investigation'
        };
        
        return {
          ...hunt,
          status: 'active' as const,
          timeline: {
            ...hunt.timeline,
            lastActivity: new Date()
          },
          findings: [...hunt.findings, newFinding]
        };
      }
      return hunt;
    }));
    
    setIsRunningHunt(false);
    onHuntingResultFound?.({ huntId, timestamp: new Date(), findings: 1 });
  }, [onHuntingResultFound]);

  // Filtered Data
  const filteredHunts = useMemo(() => {
    return threatHunts.filter(hunt => {
      const matchesSearch = searchTerm === '' ||
        hunt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hunt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hunt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || hunt.status === filterStatus;
      const matchesSeverity = filterSeverity === 'all' || hunt.priority === filterSeverity;
      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [threatHunts, searchTerm, filterStatus, filterSeverity]);

  const filteredDarkWeb = useMemo(() => {
    return darkWebMonitoring.filter(monitoring => {
      const matchesSearch = searchTerm === '' ||
        monitoring.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        monitoring.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        monitoring.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || monitoring.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [darkWebMonitoring, searchTerm, filterStatus]);

  return (
    <div className="threat-hunting-darkweb">
      {/* Header */}
      <div className="thd-header">
        <div className="header-main">
          <h2>🎯 Threat Hunting & Dark Web Monitoring</h2>
          <div className="header-stats">
            <span className="stat">
              <strong>{threatHunts.filter(h => h.status === 'active').length}</strong> Active Hunts
            </span>
            <span className="stat">
              <strong>{darkWebMonitoring.filter(m => m.status === 'active').length}</strong> DW Monitors
            </span>
            <span className="stat">
              <strong>{threatIntel.filter(i => i.severity === 'critical' || i.severity === 'high').length}</strong> Critical Intel
            </span>
            <span className="stat">
              <strong>{darkWebMonitoring.reduce((acc, m) => acc + m.alerts.filter(a => !a.investigated).length, 0)}</strong> New Alerts
            </span>
          </div>
        </div>

        <div className="header-controls">
          <input
            type="text"
            placeholder="Search hunts, monitoring, and intelligence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="thd-tabs">
        <button 
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab-button ${activeTab === 'hunts' ? 'active' : ''}`}
          onClick={() => setActiveTab('hunts')}
        >
          🎯 Threat Hunts
        </button>
        <button 
          className={`tab-button ${activeTab === 'darkweb' ? 'active' : ''}`}
          onClick={() => setActiveTab('darkweb')}
        >
          🕸️ Dark Web
        </button>
        <button 
          className={`tab-button ${activeTab === 'intel' ? 'active' : ''}`}
          onClick={() => setActiveTab('intel')}
        >
          🧠 Intelligence
        </button>
        <button 
          className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          📋 Rules
        </button>
      </div>

      <div className="thd-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="dashboard-overview">
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-header">
                    <h3>🎯 Active Threat Hunts</h3>
                  </div>
                  <div className="metric-value">{threatHunts.filter(h => h.status === 'active').length}</div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>High Priority: {threatHunts.filter(h => h.status === 'active' && h.priority === 'high').length}</span>
                    </div>
                    <div className="detail-item">
                      <span>Critical: {threatHunts.filter(h => h.status === 'active' && h.priority === 'critical').length}</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <h3>🕸️ Dark Web Alerts</h3>
                  </div>
                  <div className="metric-value">
                    {darkWebMonitoring.reduce((acc, m) => acc + m.alerts.filter(a => !a.investigated).length, 0)}
                  </div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>Critical: {darkWebMonitoring.reduce((acc, m) => acc + m.alerts.filter(a => a.severity === 'critical' && !a.investigated).length, 0)}</span>
                    </div>
                    <div className="detail-item">
                      <span>High: {darkWebMonitoring.reduce((acc, m) => acc + m.alerts.filter(a => a.severity === 'high' && !a.investigated).length, 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <h3>🧠 Threat Intelligence</h3>
                  </div>
                  <div className="metric-value">{threatIntel.length}</div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>APT Groups: {threatIntel.filter(i => i.type === 'apt').length}</span>
                    </div>
                    <div className="detail-item">
                      <span>Malware: {threatIntel.filter(i => i.type === 'malware').length}</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <h3>📋 Active Rules</h3>
                  </div>
                  <div className="metric-value">{huntingRules.filter(r => r.enabled).length}</div>
                  <div className="metric-details">
                    <div className="detail-item">
                      <span>Detection: {huntingRules.filter(r => r.enabled && r.category === 'detection').length}</span>
                    </div>
                    <div className="detail-item">
                      <span>Hunting: {huntingRules.filter(r => r.enabled && r.category === 'hunting').length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity">
                <h3>🔥 Recent Activity</h3>
                <div className="activity-list">
                  {[
                    ...threatHunts.flatMap(hunt => 
                      hunt.findings.map(finding => ({
                        type: 'hunt_finding',
                        timestamp: finding.timestamp,
                        title: `Hunt Finding: ${finding.title}`,
                        severity: finding.severity,
                        source: hunt.name
                      }))
                    ),
                    ...darkWebMonitoring.flatMap(monitoring =>
                      monitoring.alerts.slice(0, 2).map(alert => ({
                        type: 'darkweb_alert',
                        timestamp: alert.timestamp,
                        title: `Dark Web Alert: ${alert.title}`,
                        severity: alert.severity,
                        source: monitoring.name
                      }))
                    )
                  ]
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .slice(0, 10)
                  .map((activity, index) => (
                    <div key={index} className={`activity-item ${activity.severity}`}>
                      <div className="activity-icon">
                        {activity.type === 'hunt_finding' ? '🎯' : '🕸️'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">{activity.title}</div>
                        <div className="activity-meta">
                          <span className="activity-source">{activity.source}</span>
                          <span className="activity-time">
                            {activity.timestamp.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className={`activity-severity ${activity.severity}`}>
                        {activity.severity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Threat Intelligence Summary */}
              <div className="intel-summary">
                <h3>🧠 Intelligence Summary</h3>
                <div className="intel-grid">
                  {threatIntel.slice(0, 4).map(intel => (
                    <div key={intel.id} className={`intel-card ${intel.severity}`}>
                      <div className="intel-header">
                        <span className={`intel-type ${intel.type}`}>{intel.type.toUpperCase()}</span>
                        <span className={`intel-tlp ${intel.tlp}`}>TLP:{intel.tlp.toUpperCase()}</span>
                      </div>
                      <div className="intel-name">{intel.name}</div>
                      <div className="intel-confidence">
                        Confidence: {intel.confidence}%
                      </div>
                      <div className="intel-tags">
                        {intel.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="intel-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Threat Hunts Tab */}
        {activeTab === 'hunts' && (
          <div className="hunts-tab">
            <div className="tab-header">
              <h3>🎯 Active Threat Hunts</h3>
              <div className="header-actions">
                <button 
                  className="primary-button"
                  onClick={() => setShowNewHuntModal(true)}
                >
                  + New Hunt
                </button>
              </div>
            </div>

            <div className="hunts-grid">
              {filteredHunts.map(hunt => (
                <div 
                  key={hunt.id}
                  className={`hunt-card ${selectedHunt?.id === hunt.id ? 'selected' : ''}`}
                  onClick={() => setSelectedHunt(hunt)}
                >
                  <div className="hunt-header">
                    <div className="hunt-meta">
                      <span className={`hunt-type ${hunt.type}`}>
                        {hunt.type.replace('_', ' ')}
                      </span>
                      <span className={`priority-badge ${hunt.priority}`}>
                        {hunt.priority}
                      </span>
                    </div>
                    <div className={`status-indicator ${hunt.status}`}></div>
                  </div>

                  <div className="hunt-title">{hunt.name}</div>
                  <div className="hunt-description">{hunt.description}</div>

                  <div className="hunt-hypothesis">
                    <strong>Hypothesis:</strong> {hunt.hypothesis}
                  </div>

                  <div className="hunt-stats">
                    <div className="stat-item">
                      <span className="stat-label">IOCs:</span>
                      <span className="stat-value">{hunt.iocs.length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Queries:</span>
                      <span className="stat-value">{hunt.queries.length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Findings:</span>
                      <span className="stat-value">{hunt.findings.length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">TTPs:</span>
                      <span className="stat-value">{hunt.techniques.length}</span>
                    </div>
                  </div>

                  <div className="hunt-assignee">
                    <strong>Lead Analyst:</strong> {hunt.assignedTo}
                  </div>

                  <div className="hunt-timeline">
                    <div className="timeline-item">
                      <strong>Created:</strong> {hunt.timeline.created.toLocaleDateString()}
                    </div>
                    {hunt.timeline.lastActivity && (
                      <div className="timeline-item">
                        <strong>Last Activity:</strong> {hunt.timeline.lastActivity.toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="hunt-tags">
                    {hunt.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="hunt-tag">{tag}</span>
                    ))}
                  </div>

                  <div className="hunt-actions">
                    <button 
                      className="action-button primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        runThreatHunt(hunt.id);
                      }}
                      disabled={isRunningHunt}
                    >
                      {isRunningHunt ? '🔄 Running...' : '▶️ Run Hunt'}
                    </button>
                    <button className="action-button">📊 Results</button>
                    <button className="action-button">⚙️ Configure</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Hunt Details Panel */}
            {selectedHunt && (
              <div className="hunt-details-panel">
                <div className="panel-header">
                  <h3>{selectedHunt.name}</h3>
                  <div className="panel-actions">
                    <button className="action-button">📊 View Results</button>
                    <button className="action-button">⚙️ Edit Hunt</button>
                    <button 
                      className="close-button"
                      onClick={() => setSelectedHunt(null)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="panel-content">
                  <div className="detail-section">
                    <h4>Hunt Configuration</h4>
                    <div className="config-grid">
                      <div className="config-item">
                        <label>Type:</label>
                        <span className={`hunt-type-badge ${selectedHunt.type}`}>
                          {selectedHunt.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="config-item">
                        <label>Status:</label>
                        <span className={`status-badge ${selectedHunt.status}`}>
                          {selectedHunt.status}
                        </span>
                      </div>
                      <div className="config-item">
                        <label>Priority:</label>
                        <span className={`priority-badge ${selectedHunt.priority}`}>
                          {selectedHunt.priority}
                        </span>
                      </div>
                      <div className="config-item">
                        <label>Lead Analyst:</label>
                        <span>{selectedHunt.assignedTo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>MITRE ATT&CK Mapping</h4>
                    <div className="mitre-mapping">
                      <div className="tactics-list">
                        <strong>Tactics:</strong>
                        {selectedHunt.tactics.map(tactic => (
                          <span key={tactic} className="mitre-tag tactic">{tactic}</span>
                        ))}
                      </div>
                      <div className="techniques-list">
                        <strong>Techniques:</strong>
                        {selectedHunt.techniques.map(technique => (
                          <span key={technique} className="mitre-tag technique">{technique}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Indicators of Compromise ({selectedHunt.iocs.length})</h4>
                    <div className="iocs-list">
                      {selectedHunt.iocs.map((ioc, index) => (
                        <div key={index} className="ioc-item">
                          <div className="ioc-header">
                            <span className={`ioc-type ${ioc.type}`}>{ioc.type.toUpperCase()}</span>
                            <span className="ioc-confidence">
                              Confidence: {ioc.confidence}%
                            </span>
                          </div>
                          <div className="ioc-value">{ioc.value}</div>
                          <div className="ioc-details">
                            <span>Source: {ioc.source}</span>
                            <span>First: {ioc.firstSeen.toLocaleDateString()}</span>
                            <span>Last: {ioc.lastSeen.toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Hunt Queries ({selectedHunt.queries.length})</h4>
                    <div className="queries-list">
                      {selectedHunt.queries.map(query => (
                        <div key={query.id} className="query-item">
                          <div className="query-header">
                            <span className="query-name">{query.name}</span>
                            <div className="query-meta">
                              <span className={`platform-badge ${query.platform}`}>
                                {query.platform}
                              </span>
                              <span className={`query-status ${query.enabled ? 'enabled' : 'disabled'}`}>
                                {query.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </div>
                          <div className="query-code">
                            <code>{query.query}</code>
                          </div>
                          <div className="query-stats">
                            <span>Schedule: {query.schedule}</span>
                            {query.lastRun && (
                              <>
                                <span>Last Run: {query.lastRun.toLocaleString()}</span>
                                <span>Results: {query.results}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Findings ({selectedHunt.findings.length})</h4>
                    <div className="findings-list">
                      {selectedHunt.findings.map(finding => (
                        <div key={finding.id} className={`finding-item ${finding.severity}`}>
                          <div className="finding-header">
                            <span className="finding-title">{finding.title}</span>
                            <div className="finding-meta">
                              <span className={`severity-badge ${finding.severity}`}>
                                {finding.severity}
                              </span>
                              <span className="finding-timestamp">
                                {finding.timestamp.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="finding-description">
                            {finding.description}
                          </div>
                          <div className="finding-analyst">
                            <strong>Analyst:</strong> {finding.analyst}
                          </div>
                          {finding.notes && (
                            <div className="finding-notes">
                              <strong>Notes:</strong> {finding.notes}
                            </div>
                          )}
                          <div className="finding-evidence">
                            <strong>Evidence:</strong>
                            {finding.evidence.map((evidence, index) => (
                              <span key={index} className="evidence-tag">{evidence}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dark Web Tab */}
        {activeTab === 'darkweb' && (
          <div className="darkweb-tab">
            <div className="tab-header">
              <h3>🕸️ Dark Web Monitoring</h3>
              <div className="header-actions">
                <button 
                  className="primary-button"
                  onClick={() => setShowNewMonitoringModal(true)}
                >
                  + New Monitor
                </button>
              </div>
            </div>

            <div className="darkweb-grid">
              {filteredDarkWeb.map(monitoring => (
                <div 
                  key={monitoring.id}
                  className={`monitoring-card ${selectedMonitoring?.id === monitoring.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMonitoring(monitoring)}
                >
                  <div className="monitoring-header">
                    <span className={`monitoring-type ${monitoring.type}`}>
                      {monitoring.type.replace('_', ' ')}
                    </span>
                    <div className={`status-indicator ${monitoring.status}`}></div>
                  </div>

                  <div className="monitoring-title">{monitoring.name}</div>
                  <div className="monitoring-description">{monitoring.description}</div>

                  <div className="monitoring-stats">
                    <div className="stat-item">
                      <span className="stat-label">Targets:</span>
                      <span className="stat-value">{monitoring.targets.length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Sources:</span>
                      <span className="stat-value">{monitoring.sources.filter(s => s.enabled).length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Alerts:</span>
                      <span className={`stat-value ${monitoring.alerts.filter(a => !a.investigated).length > 0 ? 'alert' : ''}`}>
                        {monitoring.alerts.filter(a => !a.investigated).length}
                      </span>
                    </div>
                  </div>

                  <div className="monitoring-schedule">
                    <div className="schedule-info">
                      <strong>Frequency:</strong> {monitoring.schedule.frequency}
                    </div>
                    {monitoring.schedule.lastRun && (
                      <div className="schedule-info">
                        <strong>Last Run:</strong> {monitoring.schedule.lastRun.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="monitoring-assignee">
                    <strong>Assigned to:</strong> {monitoring.assignedTo}
                  </div>

                  <div className="monitoring-tags">
                    {monitoring.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="monitoring-tag">{tag}</span>
                    ))}
                  </div>

                  {monitoring.alerts.filter(a => !a.investigated).length > 0 && (
                    <div className="urgent-alerts">
                      <strong>⚠️ {monitoring.alerts.filter(a => !a.investigated).length} New Alerts</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Monitoring Details Panel */}
            {selectedMonitoring && (
              <div className="monitoring-details-panel">
                <div className="panel-header">
                  <h3>{selectedMonitoring.name}</h3>
                  <div className="panel-actions">
                    <button className="action-button">🔍 View Sources</button>
                    <button className="action-button">⚙️ Edit Monitor</button>
                    <button 
                      className="close-button"
                      onClick={() => setSelectedMonitoring(null)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="panel-content">
                  <div className="detail-section">
                    <h4>Monitoring Targets ({selectedMonitoring.targets.length})</h4>
                    <div className="targets-list">
                      {selectedMonitoring.targets.map((target, index) => (
                        <div key={index} className="target-item">
                          <div className="target-header">
                            <span className={`target-type ${target.type}`}>
                              {target.type}
                            </span>
                            <span className={`sensitivity-badge ${target.sensitivity}`}>
                              {target.sensitivity}
                            </span>
                          </div>
                          <div className="target-value">{target.value}</div>
                          {target.variations.length > 0 && (
                            <div className="target-variations">
                              <strong>Variations:</strong> {target.variations.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Monitoring Sources ({selectedMonitoring.sources.length})</h4>
                    <div className="sources-list">
                      {selectedMonitoring.sources.map((source, index) => (
                        <div key={index} className={`source-item ${source.enabled ? 'enabled' : 'disabled'}`}>
                          <div className="source-header">
                            <span className={`source-type ${source.type}`}>
                              {source.type}
                            </span>
                            <span className={`access-level ${source.accessLevel}`}>
                              {source.accessLevel}
                            </span>
                            <span className={`source-status ${source.enabled ? 'enabled' : 'disabled'}`}>
                              {source.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="source-name">{source.name}</div>
                          {source.url && (
                            <div className="source-url">{source.url}</div>
                          )}
                          <div className="source-details">
                            <span>
                              Credentials Required: {source.credentialsRequired ? 'Yes' : 'No'}
                            </span>
                            {source.lastScanned && (
                              <span>
                                Last Scanned: {source.lastScanned.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Recent Alerts ({selectedMonitoring.alerts.length})</h4>
                    <div className="alerts-list">
                      {selectedMonitoring.alerts
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                        .slice(0, 10)
                        .map(alert => (
                          <div key={alert.id} className={`alert-item ${alert.severity}`}>
                            <div className="alert-header">
                              <span className="alert-title">{alert.title}</span>
                              <div className="alert-meta">
                                <span className={`severity-badge ${alert.severity}`}>
                                  {alert.severity}
                                </span>
                                <span className="alert-timestamp">
                                  {alert.timestamp.toLocaleString()}
                                </span>
                                {alert.investigated && (
                                  <span className="investigated-badge">Investigated</span>
                                )}
                              </div>
                            </div>
                            <div className="alert-summary">{alert.summary}</div>
                            <div className="alert-source">
                              <strong>Source:</strong> {alert.source}
                            </div>
                            <div className="alert-targets">
                              <strong>Matched Targets:</strong>
                              {alert.matched_targets.map(target => (
                                <span key={target} className="matched-target">{target}</span>
                              ))}
                            </div>
                            {alert.notes && (
                              <div className="alert-notes">
                                <strong>Notes:</strong> {alert.notes}
                              </div>
                            )}
                            {!alert.investigated && (
                              <div className="alert-actions">
                                <button className="action-button small">🔍 Investigate</button>
                                <button className="action-button small">❌ Mark False Positive</button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Intelligence Tab */}
        {activeTab === 'intel' && (
          <div className="intel-tab">
            <div className="tab-header">
              <h3>🧠 Threat Intelligence Feed</h3>
            </div>

            <div className="intel-grid">
              {threatIntel.map(intel => (
                <div key={intel.id} className={`intel-card ${intel.severity}`}>
                  <div className="intel-header">
                    <div className="intel-meta">
                      <span className={`intel-type ${intel.type}`}>
                        {intel.type.toUpperCase()}
                      </span>
                      <span className={`tlp-badge ${intel.tlp}`}>
                        TLP:{intel.tlp.toUpperCase()}
                      </span>
                    </div>
                    <span className={`severity-badge ${intel.severity}`}>
                      {intel.severity}
                    </span>
                  </div>

                  <div className="intel-name">{intel.name}</div>
                  <div className="intel-description">{intel.description}</div>

                  <div className="intel-confidence">
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill"
                        style={{ width: `${intel.confidence}%` }}
                      ></div>
                    </div>
                    <span className="confidence-text">Confidence: {intel.confidence}%</span>
                  </div>

                  <div className="intel-attribution">
                    <div className="attribution-item">
                      <strong>Actors:</strong> {intel.attribution.actors.join(', ')}
                    </div>
                    {intel.attribution.countries.length > 0 && (
                      <div className="attribution-item">
                        <strong>Countries:</strong> {intel.attribution.countries.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="intel-iocs">
                    <strong>IOCs ({intel.iocs.length}):</strong>
                    <div className="iocs-preview">
                      {intel.iocs.slice(0, 3).map((ioc, index) => (
                        <span key={index} className={`ioc-tag ${ioc.type}`}>
                          {ioc.type}: {ioc.value.length > 20 ? `${ioc.value.substring(0, 20)}...` : ioc.value}
                        </span>
                      ))}
                      {intel.iocs.length > 3 && (
                        <span className="more-iocs">+{intel.iocs.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  <div className="intel-sources">
                    <strong>Sources:</strong>
                    {intel.sources.map((source, index) => (
                      <span key={index} className={`source-tag ${source.type} reliability-${source.reliability.toLowerCase()}`}>
                        {source.name} ({source.reliability})
                      </span>
                    ))}
                  </div>

                  <div className="intel-timeline">
                    <div className="timeline-item">
                      <strong>First Observed:</strong> {intel.timeline.first_observed.toLocaleDateString()}
                    </div>
                    <div className="timeline-item">
                      <strong>Last Updated:</strong> {intel.timeline.updated.toLocaleDateString()}
                    </div>
                  </div>

                  <div className="intel-tags">
                    {intel.tags.map(tag => (
                      <span key={tag} className="intel-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="rules-tab">
            <div className="tab-header">
              <h3>📋 Hunting Rules</h3>
              <button className="primary-button">+ New Rule</button>
            </div>

            <div className="rules-grid">
              {huntingRules.map(rule => (
                <div key={rule.id} className="rule-card">
                  <div className="rule-header">
                    <div className="rule-meta">
                      <span className={`rule-type ${rule.rule_type}`}>
                        {rule.rule_type.toUpperCase()}
                      </span>
                      <span className={`category-badge ${rule.category}`}>
                        {rule.category}
                      </span>
                    </div>
                    <div className="rule-status">
                      <span className={`status-indicator ${rule.enabled ? 'enabled' : 'disabled'}`}></span>
                      <span className={`severity-badge ${rule.severity}`}>{rule.severity}</span>
                    </div>
                  </div>

                  <div className="rule-name">{rule.name}</div>
                  <div className="rule-description">{rule.description}</div>

                  <div className="rule-performance">
                    <div className="performance-metric">
                      <span className="metric-label">Detection Rate:</span>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill detection"
                          style={{ width: `${rule.detection_rate}%` }}
                        ></div>
                      </div>
                      <span className="metric-value">{rule.detection_rate}%</span>
                    </div>
                    <div className="performance-metric">
                      <span className="metric-label">False Positive:</span>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill false-positive"
                          style={{ width: `${rule.false_positive_rate}%` }}
                        ></div>
                      </div>
                      <span className="metric-value">{rule.false_positive_rate}%</span>
                    </div>
                  </div>

                  <div className="rule-mitre">
                    <div className="mitre-tactics">
                      <strong>MITRE Tactics:</strong>
                      {rule.mitre_tactics.map(tactic => (
                        <span key={tactic} className="mitre-tag tactic">{tactic}</span>
                      ))}
                    </div>
                    <div className="mitre-techniques">
                      <strong>Techniques:</strong>
                      {rule.mitre_techniques.map(technique => (
                        <span key={technique} className="mitre-tag technique">{technique}</span>
                      ))}
                    </div>
                  </div>

                  <div className="rule-details">
                    <div className="detail-item">
                      <strong>Author:</strong> {rule.author}
                    </div>
                    <div className="detail-item">
                      <strong>Version:</strong> {rule.version}
                    </div>
                    <div className="detail-item">
                      <strong>Updated:</strong> {rule.updated.toLocaleDateString()}
                    </div>
                    <div className="detail-item">
                      <strong>Impact:</strong>
                      <span className={`impact-badge ${rule.performance_impact}`}>
                        {rule.performance_impact}
                      </span>
                    </div>
                  </div>

                  <div className="rule-actions">
                    <button className="action-button">👁 View Rule</button>
                    <button className="action-button">⚙️ Edit</button>
                    <button className={`action-button ${rule.enabled ? 'disable' : 'enable'}`}>
                      {rule.enabled ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isRunningHunt && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner large"></div>
            <h3>Running Threat Hunt...</h3>
            <p>Executing queries and analyzing results...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatHuntingDarkWeb;