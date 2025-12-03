/**
 * STIX 2.1 Complete Type Definitions
 * Comprehensive types for STIX Domain Objects (SDOs), Relationship Objects (SROs),
 * and Cyber Observable Objects (SCOs)
 */

// ============================================================================
// Common Types
// ============================================================================

export type StixId = `${StixType}--${string}`;

export type StixType =
  | 'attack-pattern'
  | 'campaign'
  | 'course-of-action'
  | 'grouping'
  | 'identity'
  | 'incident'
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
  | 'vulnerability'
  | 'relationship'
  | 'sighting'
  | 'marking-definition'
  | 'extension-definition'
  | 'bundle';

export interface ExternalReference {
  source_name: string;
  description?: string;
  url?: string;
  hashes?: Record<string, string>;
  external_id?: string;
}

export interface KillChainPhase {
  kill_chain_name: string;
  phase_name: string;
}

export interface GranularMarking {
  lang?: string;
  marking_ref?: StixId;
  selectors: string[];
}

// ============================================================================
// STIX Common Properties (base for all STIX objects)
// ============================================================================

export interface StixCommonProperties {
  type: StixType;
  spec_version: '2.1';
  id: StixId;
  created_by_ref?: StixId;
  created: string;
  modified: string;
  revoked?: boolean;
  labels?: string[];
  confidence?: number;
  lang?: string;
  external_references?: ExternalReference[];
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
  defanged?: boolean;
  extensions?: Record<string, unknown>;
}

// ============================================================================
// STIX Domain Objects (SDOs)
// ============================================================================

export interface AttackPattern extends StixCommonProperties {
  type: 'attack-pattern';
  name: string;
  description?: string;
  aliases?: string[];
  kill_chain_phases?: KillChainPhase[];
}

export interface Campaign extends StixCommonProperties {
  type: 'campaign';
  name: string;
  description?: string;
  aliases?: string[];
  first_seen?: string;
  last_seen?: string;
  objective?: string;
}

export interface CourseOfAction extends StixCommonProperties {
  type: 'course-of-action';
  name: string;
  description?: string;
  action_type?: string;
  os_execution_envs?: string[];
  action_bin?: string;
  action_reference?: ExternalReference;
}

export interface Grouping extends StixCommonProperties {
  type: 'grouping';
  name?: string;
  description?: string;
  context: string;
  object_refs: StixId[];
}

export interface Identity extends StixCommonProperties {
  type: 'identity';
  name: string;
  description?: string;
  roles?: string[];
  identity_class?: string;
  sectors?: string[];
  contact_information?: string;
}

export interface Incident extends StixCommonProperties {
  type: 'incident';
  name: string;
  description?: string;
  incident_types?: string[];
}

export interface Indicator extends StixCommonProperties {
  type: 'indicator';
  name?: string;
  description?: string;
  indicator_types?: string[];
  pattern: string;
  pattern_type: 'stix' | 'pcre' | 'sigma' | 'snort' | 'suricata' | 'yara';
  pattern_version?: string;
  valid_from: string;
  valid_until?: string;
  kill_chain_phases?: KillChainPhase[];
}

export interface Infrastructure extends StixCommonProperties {
  type: 'infrastructure';
  name: string;
  description?: string;
  infrastructure_types?: string[];
  aliases?: string[];
  kill_chain_phases?: KillChainPhase[];
  first_seen?: string;
  last_seen?: string;
}

export interface IntrusionSet extends StixCommonProperties {
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

export interface Location extends StixCommonProperties {
  type: 'location';
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  precision?: number;
  region?: string;
  country?: string;
  administrative_area?: string;
  city?: string;
  street_address?: string;
  postal_code?: string;
}

export interface Malware extends StixCommonProperties {
  type: 'malware';
  name?: string;
  description?: string;
  malware_types?: string[];
  is_family: boolean;
  aliases?: string[];
  kill_chain_phases?: KillChainPhase[];
  first_seen?: string;
  last_seen?: string;
  operating_system_refs?: StixId[];
  architecture_execution_envs?: string[];
  implementation_languages?: string[];
  capabilities?: string[];
  sample_refs?: StixId[];
}

export interface MalwareAnalysis extends StixCommonProperties {
  type: 'malware-analysis';
  product: string;
  version?: string;
  host_vm_ref?: StixId;
  operating_system_ref?: StixId;
  installed_software_refs?: StixId[];
  configuration_version?: string;
  modules?: string[];
  analysis_engine_version?: string;
  analysis_definition_version?: string;
  submitted?: string;
  analysis_started?: string;
  analysis_ended?: string;
  result_name?: string;
  result?: 'malicious' | 'suspicious' | 'benign' | 'unknown';
  analysis_sco_refs?: StixId[];
  sample_ref?: StixId;
}

export interface Note extends StixCommonProperties {
  type: 'note';
  abstract?: string;
  content: string;
  authors?: string[];
  object_refs: StixId[];
}

export interface ObservedData extends StixCommonProperties {
  type: 'observed-data';
  first_observed: string;
  last_observed: string;
  number_observed: number;
  object_refs?: StixId[];
}

export interface Opinion extends StixCommonProperties {
  type: 'opinion';
  explanation?: string;
  authors?: string[];
  opinion: 'strongly-disagree' | 'disagree' | 'neutral' | 'agree' | 'strongly-agree';
  object_refs: StixId[];
}

export interface Report extends StixCommonProperties {
  type: 'report';
  name: string;
  description?: string;
  report_types?: string[];
  published: string;
  object_refs: StixId[];
}

export interface ThreatActor extends StixCommonProperties {
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

export interface Tool extends StixCommonProperties {
  type: 'tool';
  name: string;
  description?: string;
  tool_types?: string[];
  aliases?: string[];
  kill_chain_phases?: KillChainPhase[];
  tool_version?: string;
}

export interface Vulnerability extends StixCommonProperties {
  type: 'vulnerability';
  name: string;
  description?: string;
}

// ============================================================================
// STIX Relationship Objects (SROs)
// ============================================================================

export interface Relationship extends StixCommonProperties {
  type: 'relationship';
  relationship_type: string;
  description?: string;
  source_ref: StixId;
  target_ref: StixId;
  start_time?: string;
  stop_time?: string;
}

export interface Sighting extends StixCommonProperties {
  type: 'sighting';
  description?: string;
  first_seen?: string;
  last_seen?: string;
  count?: number;
  sighting_of_ref: StixId;
  observed_data_refs?: StixId[];
  where_sighted_refs?: StixId[];
  summary?: boolean;
}

// ============================================================================
// STIX Meta Objects
// ============================================================================

export interface MarkingDefinition {
  type: 'marking-definition';
  spec_version: '2.1';
  id: StixId;
  created_by_ref?: StixId;
  created: string;
  external_references?: ExternalReference[];
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
  extensions?: Record<string, unknown>;
  name?: string;
  definition_type: string;
  definition: Record<string, unknown>;
}

export interface ExtensionDefinition extends StixCommonProperties {
  type: 'extension-definition';
  name: string;
  description?: string;
  schema: string;
  version: string;
  extension_types: ('new-sdo' | 'new-sco' | 'new-sro' | 'property-extension' | 'toplevel-property-extension')[];
  extension_properties?: string[];
}

// ============================================================================
// STIX Cyber Observable Objects (SCOs)
// ============================================================================

export interface Artifact {
  type: 'artifact';
  id: StixId;
  spec_version: '2.1';
  mime_type?: string;
  payload_bin?: string;
  url?: string;
  hashes?: Record<string, string>;
  encryption_algorithm?: string;
  decryption_key?: string;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface AutonomousSystem {
  type: 'autonomous-system';
  id: StixId;
  spec_version: '2.1';
  number: number;
  name?: string;
  rir?: string;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface Directory {
  type: 'directory';
  id: StixId;
  spec_version: '2.1';
  path: string;
  path_enc?: string;
  ctime?: string;
  mtime?: string;
  atime?: string;
  contains_refs?: StixId[];
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface DomainName {
  type: 'domain-name';
  id: StixId;
  spec_version: '2.1';
  value: string;
  resolves_to_refs?: StixId[];
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface EmailAddress {
  type: 'email-addr';
  id: StixId;
  spec_version: '2.1';
  value: string;
  display_name?: string;
  belongs_to_ref?: StixId;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface EmailMessage {
  type: 'email-message';
  id: StixId;
  spec_version: '2.1';
  is_multipart: boolean;
  date?: string;
  content_type?: string;
  from_ref?: StixId;
  sender_ref?: StixId;
  to_refs?: StixId[];
  cc_refs?: StixId[];
  bcc_refs?: StixId[];
  message_id?: string;
  subject?: string;
  received_lines?: string[];
  additional_header_fields?: Record<string, string | string[]>;
  body?: string;
  body_multipart?: Array<{
    body?: string;
    body_raw_ref?: StixId;
    content_type?: string;
    content_disposition?: string;
  }>;
  raw_email_ref?: StixId;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface File {
  type: 'file';
  id: StixId;
  spec_version: '2.1';
  hashes?: Record<string, string>;
  size?: number;
  name?: string;
  name_enc?: string;
  magic_number_hex?: string;
  mime_type?: string;
  ctime?: string;
  mtime?: string;
  atime?: string;
  parent_directory_ref?: StixId;
  contains_refs?: StixId[];
  content_ref?: StixId;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface IPv4Address {
  type: 'ipv4-addr';
  id: StixId;
  spec_version: '2.1';
  value: string;
  resolves_to_refs?: StixId[];
  belongs_to_refs?: StixId[];
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface IPv6Address {
  type: 'ipv6-addr';
  id: StixId;
  spec_version: '2.1';
  value: string;
  resolves_to_refs?: StixId[];
  belongs_to_refs?: StixId[];
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface MACAddress {
  type: 'mac-addr';
  id: StixId;
  spec_version: '2.1';
  value: string;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface Mutex {
  type: 'mutex';
  id: StixId;
  spec_version: '2.1';
  name: string;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface NetworkTraffic {
  type: 'network-traffic';
  id: StixId;
  spec_version: '2.1';
  start?: string;
  end?: string;
  is_active?: boolean;
  src_ref?: StixId;
  dst_ref?: StixId;
  src_port?: number;
  dst_port?: number;
  protocols?: string[];
  src_byte_count?: number;
  dst_byte_count?: number;
  src_packets?: number;
  dst_packets?: number;
  ipfix?: Record<string, unknown>;
  src_payload_ref?: StixId;
  dst_payload_ref?: StixId;
  encapsulates_refs?: StixId[];
  encapsulated_by_ref?: StixId;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface Process {
  type: 'process';
  id: StixId;
  spec_version: '2.1';
  is_hidden?: boolean;
  pid?: number;
  created_time?: string;
  cwd?: string;
  command_line?: string;
  environment_variables?: Record<string, string>;
  opened_connection_refs?: StixId[];
  creator_user_ref?: StixId;
  image_ref?: StixId;
  parent_ref?: StixId;
  child_refs?: StixId[];
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface Software {
  type: 'software';
  id: StixId;
  spec_version: '2.1';
  name: string;
  cpe?: string;
  swid?: string;
  languages?: string[];
  vendor?: string;
  version?: string;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface URL {
  type: 'url';
  id: StixId;
  spec_version: '2.1';
  value: string;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface UserAccount {
  type: 'user-account';
  id: StixId;
  spec_version: '2.1';
  user_id?: string;
  credential?: string;
  account_login?: string;
  account_type?: string;
  display_name?: string;
  is_service_account?: boolean;
  is_privileged?: boolean;
  can_escalate_privs?: boolean;
  is_disabled?: boolean;
  account_created?: string;
  account_expires?: string;
  credential_last_changed?: string;
  account_first_login?: string;
  account_last_login?: string;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface WindowsRegistryKey {
  type: 'windows-registry-key';
  id: StixId;
  spec_version: '2.1';
  key?: string;
  values?: Array<{
    name: string;
    data?: string;
    data_type?: string;
  }>;
  modified_time?: string;
  creator_user_ref?: StixId;
  number_of_subkeys?: number;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

export interface X509Certificate {
  type: 'x509-certificate';
  id: StixId;
  spec_version: '2.1';
  is_self_signed?: boolean;
  hashes?: Record<string, string>;
  version?: string;
  serial_number?: string;
  signature_algorithm?: string;
  issuer?: string;
  validity_not_before?: string;
  validity_not_after?: string;
  subject?: string;
  subject_public_key_algorithm?: string;
  subject_public_key_modulus?: string;
  subject_public_key_exponent?: number;
  x509_v3_extensions?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
  defanged?: boolean;
  object_marking_refs?: StixId[];
  granular_markings?: GranularMarking[];
}

// ============================================================================
// STIX Bundle
// ============================================================================

export type StixDomainObject =
  | AttackPattern
  | Campaign
  | CourseOfAction
  | Grouping
  | Identity
  | Incident
  | Indicator
  | Infrastructure
  | IntrusionSet
  | Location
  | Malware
  | MalwareAnalysis
  | Note
  | ObservedData
  | Opinion
  | Report
  | ThreatActor
  | Tool
  | Vulnerability;

export type StixRelationshipObject = Relationship | Sighting;

export type StixCyberObservable =
  | Artifact
  | AutonomousSystem
  | Directory
  | DomainName
  | EmailAddress
  | EmailMessage
  | File
  | IPv4Address
  | IPv6Address
  | MACAddress
  | Mutex
  | NetworkTraffic
  | Process
  | Software
  | URL
  | UserAccount
  | WindowsRegistryKey
  | X509Certificate;

export type StixMetaObject = MarkingDefinition | ExtensionDefinition;

export type StixObject =
  | StixDomainObject
  | StixRelationshipObject
  | StixCyberObservable
  | StixMetaObject;

export interface StixBundle {
  type: 'bundle';
  id: StixId;
  objects: StixObject[];
}

// ============================================================================
// Ingestion-specific Types
// ============================================================================

export interface IngestionMetadata {
  feedId: string;
  feedName: string;
  ingestedAt: string;
  source: string;
  collectionId?: string;
  batchId?: string;
  processingTimeMs?: number;
}

export interface EnrichedStixObject<T extends StixObject = StixObject> {
  object: T;
  metadata: IngestionMetadata;
  embedding?: number[];
  enrichments?: {
    mitreMappings?: string[];
    relatedCampaigns?: string[];
    geoLocation?: {
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    reputation?: {
      score: number;
      source: string;
      lastChecked: string;
    };
    whois?: Record<string, unknown>;
    dns?: Record<string, unknown>;
  };
}

export interface IndicatorPattern {
  type: Indicator['pattern_type'];
  pattern: string;
  parsed?: {
    objectType: string;
    property: string;
    operator: string;
    value: string;
  }[];
}
