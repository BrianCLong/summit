/**
 * Network Attack Types
 */
export enum NetworkAttackType {
  DDOS = 'ddos',
  MITM = 'mitm',
  ARP_SPOOFING = 'arp-spoofing',
  DNS_POISONING = 'dns-poisoning',
  SSL_STRIPPING = 'ssl-stripping',
  SESSION_HIJACKING = 'session-hijacking',
  PACKET_INJECTION = 'packet-injection',
  PORT_SCAN = 'port-scan',
  NETWORK_SNIFFING = 'network-sniffing'
}

/**
 * Attack Simulation Status
 */
export enum SimulationStatus {
  PLANNED = 'planned',
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABORTED = 'aborted',
  FAILED = 'failed'
}

/**
 * Network Attack Simulation
 */
export interface NetworkAttackSimulation {
  id: string;
  name: string;
  type: NetworkAttackType;
  status: SimulationStatus;
  target: AttackTarget;
  parameters: AttackParameters;
  timeline: SimulationTimeline;
  results: SimulationResults;
  safetyConfig: SafetyConfiguration;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttackTarget {
  type: 'ip' | 'subnet' | 'hostname' | 'service';
  value: string;
  port?: number;
  protocol?: 'tcp' | 'udp' | 'icmp';
}

export interface AttackParameters {
  intensity: 'low' | 'medium' | 'high';
  duration: number;
  rateLimit?: number;
  customParams?: DDoSParameters | MITMParameters | Record<string, unknown>;
}

export interface SimulationTimeline {
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  timestamp: Date;
  type: string;
  description: string;
  data?: Record<string, unknown>;
}

export interface SimulationResults {
  packetsGenerated: number;
  responsesReceived: number;
  successRate: number;
  detectionTriggered: boolean;
  detectionTime?: number;
  findings: SimulationFinding[];
  metrics: SimulationMetrics;
}

export interface SimulationFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  evidence: string[];
  remediation: string;
}

export interface SimulationMetrics {
  latency: number;
  throughput: number;
  packetLoss: number;
  jitter: number;
  successfulAttacks: number;
  blockedAttacks: number;
}

export interface SafetyConfiguration {
  maxDuration: number;
  maxPackets: number;
  autoAbort: boolean;
  allowedTargets: string[];
  blockedTargets: string[];
  emergencyStop: boolean;
}

/**
 * DDoS Simulation Parameters
 */
export interface DDoSParameters {
  attackVector: 'volumetric' | 'protocol' | 'application';
  method: 'syn-flood' | 'udp-flood' | 'http-flood' | 'slowloris' | 'dns-amplification';
  targetBandwidth: number;
  sourceIPs: string[];
  spoofedSources: boolean;
}

/**
 * MITM Simulation Parameters
 */
export interface MITMParameters {
  position: 'gateway' | 'switch' | 'wireless';
  interceptProtocols: string[];
  modifyTraffic: boolean;
  logTraffic: boolean;
  sslIntercept: boolean;
}

/**
 * Firewall Test Result
 */
export interface FirewallTestResult {
  testId: string;
  ruleTested: string;
  sourceIP: string;
  destIP: string;
  destPort: number;
  protocol: string;
  expectedAction: 'allow' | 'deny';
  actualAction: 'allow' | 'deny' | 'timeout';
  passed: boolean;
  responseTime: number;
  notes?: string;
}

/**
 * IDS/IPS Evasion Test
 */
export interface IDSEvasionTest {
  testId: string;
  technique: string;
  description: string;
  payload: string;
  encoding?: string;
  fragmentation?: boolean;
  detected: boolean;
  alertId?: string;
  evasionSuccess: boolean;
}

/**
 * Network Segmentation Test
 */
export interface SegmentationTest {
  testId: string;
  sourceSegment: string;
  targetSegment: string;
  protocol: string;
  port: number;
  expectedBlocked: boolean;
  actualBlocked: boolean;
  passed: boolean;
  notes?: string;
}
