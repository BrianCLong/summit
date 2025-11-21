/**
 * Counterterrorism Service Types
 */

export interface Operation {
  id: string;
  type: OperationType;
  name: string;
  status: OperationStatus;
  priority: Priority;
  targets: string[];
  objectives: string[];
  startDate: Date;
  endDate?: Date;
  agencies: string[];
  intelligence: IntelligencePackage[];
  outcomes: OperationOutcome[];
}

export enum OperationType {
  SURVEILLANCE = 'SURVEILLANCE',
  INTERDICTION = 'INTERDICTION',
  ARREST = 'ARREST',
  ASSET_SEIZURE = 'ASSET_SEIZURE',
  DISRUPTION = 'DISRUPTION',
  DERADICALIZATION = 'DERADICALIZATION',
  INTELLIGENCE_GATHERING = 'INTELLIGENCE_GATHERING',
  BORDER_SECURITY = 'BORDER_SECURITY',
  CYBER_OPERATION = 'CYBER_OPERATION'
}

export enum OperationStatus {
  PLANNING = 'PLANNING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export interface IntelligencePackage {
  id: string;
  type: string;
  classification: string;
  source: string;
  reliability: 'CONFIRMED' | 'PROBABLE' | 'DOUBTFUL' | 'UNCONFIRMED';
  content: string;
  collected: Date;
  expiryDate?: Date;
}

export interface OperationOutcome {
  date: Date;
  type: string;
  description: string;
  success: boolean;
  impact: string;
  metrics?: Record<string, number>;
}

export interface InterdictionOpportunity {
  id: string;
  targetId: string;
  targetType: 'INDIVIDUAL' | 'ORGANIZATION' | 'NETWORK' | 'OPERATION';
  opportunity: string;
  timeWindow: TimeWindow;
  probability: number;
  impact: number;
  recommendation: string;
  requirements: string[];
}

export interface TimeWindow {
  start: Date;
  end: Date;
  optimal?: Date;
}

export interface DisruptionTarget {
  id: string;
  type: string;
  priority: Priority;
  vulnerabilities: Vulnerability[];
  disruptionMethods: DisruptionMethod[];
  expectedImpact: string;
  risks: string[];
}

export interface Vulnerability {
  type: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  exploitable: boolean;
}

export interface DisruptionMethod {
  method: string;
  description: string;
  feasibility: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  legalCompliance: boolean;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  source: string;
  description: string;
  collected: Date;
  chainOfCustody: CustodyRecord[];
  admissible: boolean;
  relatedTargets: string[];
}

export enum EvidenceType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  TESTIMONIAL = 'TESTIMONIAL',
  DOCUMENTARY = 'DOCUMENTARY',
  SURVEILLANCE = 'SURVEILLANCE',
  FORENSIC = 'FORENSIC'
}

export interface CustodyRecord {
  date: Date;
  handler: string;
  action: string;
  location: string;
}

export interface InformationSharing {
  id: string;
  fromAgency: string;
  toAgency: string;
  classification: string;
  content: string;
  shared: Date;
  acknowledged: boolean;
  actionTaken?: string;
}

export interface LegalCompliance {
  operationId: string;
  jurisdiction: string;
  legalBasis: string[];
  authorizations: Authorization[];
  humanRights: HumanRightsAssessment;
  oversight: OversightRecord[];
}

export interface Authorization {
  authority: string;
  type: string;
  granted: Date;
  expires?: Date;
  conditions: string[];
}

export interface HumanRightsAssessment {
  conducted: boolean;
  date?: Date;
  findings: string[];
  compliance: boolean;
  mitigations: string[];
}

export interface OversightRecord {
  date: Date;
  body: string;
  type: string;
  findings: string[];
  recommendations: string[];
}

export interface EffectivenessMetrics {
  operationId: string;
  metrics: Metric[];
  overallEffectiveness: number;
  assessmentDate: Date;
}

export interface Metric {
  name: string;
  value: number;
  target?: number;
  unit: string;
}
