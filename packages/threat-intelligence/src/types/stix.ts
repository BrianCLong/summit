/**
 * STIX 2.1 Type Definitions
 * Structured Threat Information eXpression (STIX™) 2.1
 */

export type StixVersion = '2.1';

export type StixType =
  | 'attack-pattern'
  | 'campaign'
  | 'course-of-action'
  | 'grouping'
  | 'identity'
  | 'indicator'
  | 'infrastructure'
  | 'intrusion-set'
  | 'location'
  | 'malware'
  | 'malware-analysis'
  | 'note'
  | 'observed-data'
  | 'opinion'
  | 'report'
  | 'threat-actor'
  | 'tool'
  | 'vulnerability';

export type TLP = 'TLP:CLEAR' | 'TLP:WHITE' | 'TLP:GREEN' | 'TLP:AMBER' | 'TLP:AMBER+STRICT' | 'TLP:RED';

export interface StixCoreObject {
  type: StixType;
  spec_version: StixVersion;
  id: string;
  created_by_ref?: string;
  created: string;
  modified: string;
  revoked?: boolean;
  labels?: string[];
  confidence?: number;
  lang?: string;
  external_references?: ExternalReference[];
  object_marking_refs?: string[];
  granular_markings?: GranularMarking[];
}

export interface ExternalReference {
  source_name: string;
  description?: string;
  url?: string;
  hashes?: { [algorithm: string]: string };
  external_id?: string;
}

export interface GranularMarking {
  lang?: string;
  marking_ref?: string;
  selectors: string[];
}

export interface KillChainPhase {
  kill_chain_name: string;
  phase_name: string;
}

// STIX Domain Objects (SDOs)

export interface AttackPattern extends StixCoreObject {
  type: 'attack-pattern';
  name: string;
  description?: string;
  aliases?: string[];
  kill_chain_phases?: KillChainPhase[];
}

export interface Campaign extends StixCoreObject {
  type: 'campaign';
  name: string;
  description?: string;
  aliases?: string[];
  first_seen?: string;
  last_seen?: string;
  objective?: string;
}

export interface Identity extends StixCoreObject {
  type: 'identity';
  name: string;
  description?: string;
  roles?: string[];
  identity_class: 'individual' | 'group' | 'system' | 'organization' | 'class' | 'unknown';
  sectors?: string[];
  contact_information?: string;
}

export interface Indicator extends StixCoreObject {
  type: 'indicator';
  name?: string;
  description?: string;
  indicator_types?: string[];
  pattern: string;
  pattern_type: string;
  pattern_version?: string;
  valid_from: string;
  valid_until?: string;
  kill_chain_phases?: KillChainPhase[];
}

export interface IntrusionSet extends StixCoreObject {
  type: 'intrusion-set';
  name: string;
  description?: string;
  aliases?: string[];
  first_seen?: string;
  last_seen?: string;
  goals?: string[];
  resource_level?: string;
  primary_motivation?: string;
  secondary_motivations?: string[];
}

export interface Malware extends StixCoreObject {
  type: 'malware';
  name: string;
  description?: string;
  malware_types?: string[];
  is_family: boolean;
  aliases?: string[];
  kill_chain_phases?: KillChainPhase[];
  first_seen?: string;
  last_seen?: string;
  operating_system_refs?: string[];
  architecture_execution_envs?: string[];
  implementation_languages?: string[];
  capabilities?: string[];
}

export interface ThreatActor extends StixCoreObject {
  type: 'threat-actor';
  name: string;
  description?: string;
  threat_actor_types?: string[];
  aliases?: string[];
  first_seen?: string;
  last_seen?: string;
  roles?: string[];
  goals?: string[];
  sophistication?: string;
  resource_level?: string;
  primary_motivation?: string;
  secondary_motivations?: string[];
  personal_motivations?: string[];
}

export interface Tool extends StixCoreObject {
  type: 'tool';
  name: string;
  description?: string;
  tool_types?: string[];
  aliases?: string[];
  kill_chain_phases?: KillChainPhase[];
  tool_version?: string;
}

export interface Vulnerability extends StixCoreObject {
  type: 'vulnerability';
  name: string;
  description?: string;
  external_references?: ExternalReference[];
}

export interface Report extends StixCoreObject {
  type: 'report';
  name: string;
  description?: string;
  report_types?: string[];
  published: string;
  object_refs: string[];
}

// STIX Relationship Objects (SROs)

export interface Relationship {
  type: 'relationship';
  spec_version: StixVersion;
  id: string;
  created_by_ref?: string;
  created: string;
  modified: string;
  relationship_type: string;
  description?: string;
  source_ref: string;
  target_ref: string;
  start_time?: string;
  stop_time?: string;
  revoked?: boolean;
  labels?: string[];
  confidence?: number;
  external_references?: ExternalReference[];
  object_marking_refs?: string[];
  granular_markings?: GranularMarking[];
}

export interface Sighting {
  type: 'sighting';
  spec_version: StixVersion;
  id: string;
  created_by_ref?: string;
  created: string;
  modified: string;
  description?: string;
  first_seen?: string;
  last_seen?: string;
  count?: number;
  sighting_of_ref: string;
  observed_data_refs?: string[];
  where_sighted_refs?: string[];
  summary?: boolean;
  revoked?: boolean;
  labels?: string[];
  confidence?: number;
  external_references?: ExternalReference[];
  object_marking_refs?: string[];
  granular_markings?: GranularMarking[];
}

// STIX Cyber-observable Objects (SCOs)

export type CyberObservableType =
  | 'artifact'
  | 'autonomous-system'
  | 'directory'
  | 'domain-name'
  | 'email-addr'
  | 'email-message'
  | 'file'
  | 'ipv4-addr'
  | 'ipv6-addr'
  | 'mac-addr'
  | 'mutex'
  | 'network-traffic'
  | 'process'
  | 'software'
  | 'url'
  | 'user-account'
  | 'windows-registry-key'
  | 'x509-certificate';

export interface CyberObservableCore {
  type: CyberObservableType;
  id: string;
  spec_version?: StixVersion;
  object_marking_refs?: string[];
  granular_markings?: GranularMarking[];
  defanged?: boolean;
  extensions?: { [key: string]: any };
}

export interface IPv4Address extends CyberObservableCore {
  type: 'ipv4-addr';
  value: string;
  resolves_to_refs?: string[];
  belongs_to_refs?: string[];
}

export interface IPv6Address extends CyberObservableCore {
  type: 'ipv6-addr';
  value: string;
  resolves_to_refs?: string[];
  belongs_to_refs?: string[];
}

export interface DomainName extends CyberObservableCore {
  type: 'domain-name';
  value: string;
  resolves_to_refs?: string[];
}

export interface URL extends CyberObservableCore {
  type: 'url';
  value: string;
}

export interface EmailAddress extends CyberObservableCore {
  type: 'email-addr';
  value: string;
  display_name?: string;
  belongs_to_ref?: string;
}

export interface File extends CyberObservableCore {
  type: 'file';
  hashes?: { [algorithm: string]: string };
  size?: number;
  name?: string;
  name_enc?: string;
  magic_number_hex?: string;
  mime_type?: string;
  ctime?: string;
  mtime?: string;
  atime?: string;
  parent_directory_ref?: string;
  contains_refs?: string[];
  content_ref?: string;
}

// STIX Bundle

export interface StixBundle {
  type: 'bundle';
  id: string;
  objects: (StixCoreObject | Relationship | Sighting | CyberObservableCore)[];
}

// STIX Pattern Language

export interface StixPattern {
  pattern: string;
  pattern_type: 'stix' | 'snort' | 'yara' | 'sigma' | 'pcre';
  pattern_version?: string;
}
