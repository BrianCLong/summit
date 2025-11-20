/**
 * MITRE ATT&CK Framework Types
 */

export type AttackVersion = string;

export interface AttackMatrix {
  id: string;
  name: string;
  description: string;
  tactics: AttackTactic[];
  version: AttackVersion;
}

export interface AttackTactic {
  id: string;
  name: string;
  description: string;
  shortName: string;
  techniques: AttackTechnique[];
  externalReferences: ExternalReference[];
}

export interface AttackTechnique {
  id: string;
  name: string;
  description: string;
  tactics: string[];
  platforms: Platform[];
  permissions?: Permission[];
  dataSource?: DataSource[];
  defenses?: DefenseMethod[];
  detection?: string;
  url: string;
  subtechniques?: AttackSubtechnique[];
  mitigations?: Mitigation[];
  groups?: string[];
  software?: string[];
  isSubtechnique: boolean;
  created: string;
  modified: string;
  version?: string;
  externalReferences: ExternalReference[];
}

export interface AttackSubtechnique extends Omit<AttackTechnique, 'subtechniques'> {
  parentId: string;
}

export interface AttackGroup {
  id: string;
  name: string;
  description: string;
  aliases?: string[];
  techniques: string[];
  software?: string[];
  associatedCampaigns?: string[];
  country?: string;
  motivations?: string[];
  sophistication?: Sophistication;
  firstSeen?: string;
  lastSeen?: string;
  created: string;
  modified: string;
  externalReferences: ExternalReference[];
}

export interface AttackSoftware {
  id: string;
  name: string;
  description: string;
  type: SoftwareType;
  aliases?: string[];
  platforms: Platform[];
  techniques: string[];
  groups?: string[];
  labels?: string[];
  created: string;
  modified: string;
  externalReferences: ExternalReference[];
}

export interface Mitigation {
  id: string;
  name: string;
  description: string;
  techniques: string[];
  created: string;
  modified: string;
  externalReferences: ExternalReference[];
}

export interface DataSource {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
  dataComponents: DataComponent[];
  created: string;
  modified: string;
  externalReferences: ExternalReference[];
}

export interface DataComponent {
  id: string;
  name: string;
  description?: string;
  sourceDataElement?: string;
  relationshipDataElement?: string;
  techniques: string[];
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  aliases?: string[];
  firstSeen?: string;
  lastSeen?: string;
  objective?: string;
  techniques: string[];
  groups?: string[];
  software?: string[];
  created: string;
  modified: string;
  externalReferences: ExternalReference[];
}

export interface ExternalReference {
  sourceName: string;
  externalId?: string;
  url?: string;
  description?: string;
}

export type Platform =
  | 'Windows'
  | 'macOS'
  | 'Linux'
  | 'Azure'
  | 'AWS'
  | 'GCP'
  | 'Office 365'
  | 'Azure AD'
  | 'SaaS'
  | 'IaaS'
  | 'Network'
  | 'Containers'
  | 'PRE';

export type Permission =
  | 'User'
  | 'Administrator'
  | 'SYSTEM'
  | 'root';

export type SoftwareType =
  | 'malware'
  | 'tool';

export type Sophistication =
  | 'Novice'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert'
  | 'Innovator'
  | 'Strategic';

export type DefenseMethod =
  | 'User Training'
  | 'Endpoint Detection'
  | 'Network Detection'
  | 'Application Whitelisting'
  | 'Disable or Remove Feature or Program'
  | 'Execution Prevention'
  | 'Limit Access to Resource Over Network'
  | 'Network Intrusion Prevention'
  | 'Network Segmentation'
  | 'Operating System Configuration'
  | 'Privileged Account Management'
  | 'Update Software';

// Query and filter types

export interface TechniqueFilter {
  tactics?: string[];
  platforms?: Platform[];
  groups?: string[];
  software?: string[];
  search?: string;
  isSubtechnique?: boolean;
}

export interface GroupFilter {
  country?: string[];
  techniques?: string[];
  software?: string[];
  sophistication?: Sophistication[];
  search?: string;
}

export interface SoftwareFilter {
  type?: SoftwareType[];
  platforms?: Platform[];
  groups?: string[];
  techniques?: string[];
  search?: string;
}

// Mapping and correlation types

export interface TTPFingerprint {
  techniques: string[];
  tactics: string[];
  confidence: number;
  groups: AttackGroup[];
  software: AttackSoftware[];
  reasoning: string[];
}

export interface ThreatActorProfile {
  primaryGroups: AttackGroup[];
  relatedGroups: AttackGroup[];
  techniques: AttackTechnique[];
  software: AttackSoftware[];
  campaigns: Campaign[];
  ttpFingerprint: TTPFingerprint;
  confidence: number;
}

export interface CoverageMatrix {
  tactics: TacticCoverage[];
  totalTechniques: number;
  coveredTechniques: number;
  coveragePercentage: number;
}

export interface TacticCoverage {
  tactic: AttackTactic;
  totalTechniques: number;
  coveredTechniques: number;
  coveragePercentage: number;
  techniques: TechniqueCoverage[];
}

export interface TechniqueCoverage {
  technique: AttackTechnique;
  covered: boolean;
  detectionCount: number;
  mitigationCount: number;
}
