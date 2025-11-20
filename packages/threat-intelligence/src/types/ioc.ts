/**
 * Indicator of Compromise (IoC) Types
 */

export type IOCType =
  | 'ip'
  | 'ipv4'
  | 'ipv6'
  | 'domain'
  | 'url'
  | 'email'
  | 'file_hash'
  | 'md5'
  | 'sha1'
  | 'sha256'
  | 'sha512'
  | 'ssdeep'
  | 'user_agent'
  | 'registry_key'
  | 'file_path'
  | 'process_name'
  | 'service_name'
  | 'certificate_hash'
  | 'mutex'
  | 'pipe_name'
  | 'yara_rule'
  | 'sigma_rule'
  | 'ja3_hash'
  | 'ja3s_hash'
  | 'jarm_hash'
  | 'asn'
  | 'cve'
  | 'bitcoin_address'
  | 'ethereum_address'
  | 'imphash'
  | 'pehash';

export type ThreatType =
  | 'malware'
  | 'phishing'
  | 'c2'
  | 'exploit'
  | 'reconnaissance'
  | 'lateral_movement'
  | 'persistence'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'collection'
  | 'command_control'
  | 'exfiltration'
  | 'impact'
  | 'data_exfiltration'
  | 'ransomware'
  | 'apt'
  | 'insider_threat'
  | 'ddos'
  | 'cryptomining'
  | 'botnet';

export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TLP = 'CLEAR' | 'WHITE' | 'GREEN' | 'AMBER' | 'AMBER+STRICT' | 'RED';

export type Confidence = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CONFIRMED';

export interface IOC {
  id: string;
  type: IOCType;
  value: string;
  description?: string;
  threatType: ThreatType[];
  severity: Severity;
  confidence: Confidence;
  confidenceScore: number; // 0-100
  firstSeen: string;
  lastSeen: string;
  tags: string[];
  source: string;
  sources: IOCSource[];
  tlp: TLP;
  isActive: boolean;
  falsePositive: boolean;
  whitelisted: boolean;
  context: IOCContext;
  relationships: IOCRelationship[];
  sightings: IOCSighting[];
  enrichment: IOCEnrichment;
  attribution: Attribution;
  metadata: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  stixId?: string;
}

export interface IOCSource {
  name: string;
  url?: string;
  feedId?: string;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  metadata?: any;
}

export interface IOCContext {
  campaign?: string;
  campaigns?: string[];
  family?: string;
  families?: string[];
  country?: string;
  countries?: string[];
  sector?: string[];
  targetedSectors?: string[];
  killChain: KillChainPhase[];
  mitreTactics: string[];
  mitreTechniques: string[];
  capecIds?: string[];
  references: Reference[];
  aliases?: string[];
}

export interface IOCRelationship {
  relatedIOC: string;
  relationshipType: IOCRelationshipType;
  confidence: number;
  context?: string;
  firstSeen?: string;
  lastSeen?: string;
}

export type IOCRelationshipType =
  | 'related'
  | 'variant'
  | 'predecessor'
  | 'successor'
  | 'derived_from'
  | 'communicates_with'
  | 'downloads'
  | 'drops'
  | 'uses'
  | 'part_of'
  | 'parent_of'
  | 'child_of'
  | 'similar_to'
  | 'resolves_to'
  | 'belongs_to'
  | 'hosts'
  | 'owns';

export interface IOCSighting {
  id: string;
  iocId: string;
  timestamp: string;
  source: string;
  sourceType: 'internal' | 'external' | 'partner' | 'feed';
  location?: string;
  count: number;
  confidence: number;
  context?: any;
}

export interface IOCEnrichment {
  geolocation?: Geolocation;
  reputation?: ReputationData;
  dns?: DNSRecord[];
  whois?: WhoisData;
  ssl?: SSLCertificate;
  asn?: ASNData;
  sandbox?: SandboxResult[];
  threatIntel?: ThreatIntelligence[];
  malwareAnalysis?: MalwareAnalysis;
  cve?: CVEData[];
  lastEnriched?: string;
}

export interface Geolocation {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: string;
  organization?: string;
  isp?: string;
  timezone?: string;
}

export interface ReputationData {
  score: number; // 0-100
  category: ReputationCategory;
  sources: string[];
  verdicts: { [source: string]: string };
  details: any;
  lastChecked: string;
}

export type ReputationCategory = 'BENIGN' | 'SUSPICIOUS' | 'MALICIOUS' | 'UNKNOWN';

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'PTR';
  value: string;
  ttl?: number;
  timestamp: string;
}

export interface WhoisData {
  domain: string;
  registrar?: string;
  registrant?: string;
  registrantOrg?: string;
  registrantEmail?: string;
  creationDate?: string;
  expirationDate?: string;
  updatedDate?: string;
  nameservers?: string[];
  status?: string[];
  dnssec?: boolean;
}

export interface SSLCertificate {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  fingerprint: string;
  algorithm: string;
  selfSigned: boolean;
  subjectAltNames?: string[];
}

export interface ASNData {
  asn: number;
  name: string;
  country: string;
  registry: string;
  description?: string;
  prefixes?: string[];
}

export interface SandboxResult {
  id: string;
  provider: 'virustotal' | 'hybrid-analysis' | 'any.run' | 'joe-sandbox' | 'cuckoo' | 'cape';
  analysisId: string;
  verdict: SandboxVerdict;
  score: number;
  malwareFamily?: string;
  behaviors: BehaviorIndicator[];
  networkActivity: NetworkActivity[];
  fileActivity: FileActivity[];
  registryActivity: RegistryActivity[];
  processActivity: ProcessActivity[];
  screenshots?: string[];
  pcap?: string;
  reportUrl?: string;
  analyzedAt: string;
}

export type SandboxVerdict = 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS' | 'UNKNOWN' | 'ERROR';

export interface BehaviorIndicator {
  category: string;
  description: string;
  severity: Severity;
  mitreId?: string;
}

export interface NetworkActivity {
  protocol: string;
  srcIp?: string;
  srcPort?: number;
  dstIp: string;
  dstPort: number;
  domain?: string;
  url?: string;
  bytes?: number;
  packets?: number;
  timestamp: string;
}

export interface FileActivity {
  operation: 'create' | 'write' | 'delete' | 'read' | 'modify';
  path: string;
  hash?: string;
  size?: number;
  timestamp: string;
}

export interface RegistryActivity {
  operation: 'create' | 'set' | 'delete' | 'query';
  key: string;
  value?: string;
  data?: string;
  timestamp: string;
}

export interface ProcessActivity {
  pid: number;
  name: string;
  path: string;
  commandLine?: string;
  parentPid?: number;
  user?: string;
  timestamp: string;
}

export interface ThreatIntelligence {
  source: string;
  category: string;
  score: number;
  verdict?: string;
  details: any;
  lastUpdated: string;
}

export interface MalwareAnalysis {
  family?: string;
  families?: string[];
  category?: string;
  type?: string;
  capabilities?: string[];
  yara?: YaraMatch[];
  signatures?: string[];
  pe?: PEFileInfo;
}

export interface YaraMatch {
  rule: string;
  namespace?: string;
  tags?: string[];
  matches: YaraRuleMatch[];
}

export interface YaraRuleMatch {
  offset: number;
  data: string;
  length: number;
}

export interface PEFileInfo {
  imphash?: string;
  pehash?: string;
  sections?: PESection[];
  imports?: string[];
  exports?: string[];
  resources?: string[];
  compileTime?: string;
  packer?: string;
}

export interface PESection {
  name: string;
  virtualSize: number;
  virtualAddress: number;
  rawSize: number;
  entropy?: number;
  md5?: string;
}

export interface CVEData {
  cveId: string;
  description: string;
  cvssScore: number;
  cvssVector: string;
  severity: Severity;
  published: string;
  modified: string;
  references?: string[];
  cwe?: string[];
  affectedProducts?: string[];
}

export interface Reference {
  type: ReferenceType;
  url?: string;
  title?: string;
  description?: string;
  date?: string;
}

export type ReferenceType =
  | 'report'
  | 'article'
  | 'blog'
  | 'advisory'
  | 'cve'
  | 'signature'
  | 'malware_sample'
  | 'technical_analysis'
  | 'news'
  | 'social_media';

export interface Attribution {
  actor?: string;
  actors?: string[];
  group?: string;
  groups?: string[];
  country?: string;
  countries?: string[];
  confidence: Confidence;
  confidenceScore: number;
  reasoning: string[];
  aliases?: string[];
  motivations?: string[];
  ttps?: string[];
}

export type KillChainPhase =
  | 'reconnaissance'
  | 'weaponization'
  | 'delivery'
  | 'exploitation'
  | 'installation'
  | 'command_control'
  | 'actions_objectives';

// IoC Search and Filter Types

export interface IOCFilter {
  types?: IOCType[];
  threatTypes?: ThreatType[];
  severities?: Severity[];
  confidences?: Confidence[];
  sources?: string[];
  tags?: string[];
  isActive?: boolean;
  falsePositive?: boolean;
  whitelisted?: boolean;
  dateRange?: {
    start: string;
    end: string;
    field: 'firstSeen' | 'lastSeen' | 'createdAt' | 'updatedAt';
  };
  attribution?: {
    actors?: string[];
    groups?: string[];
    countries?: string[];
  };
  mitre?: {
    tactics?: string[];
    techniques?: string[];
  };
  search?: string;
}

export interface IOCSearchResult {
  iocs: IOC[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
