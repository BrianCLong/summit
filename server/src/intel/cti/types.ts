/**
 * STIX 2.1 Type Definitions for IntelGraph CTI Export
 *
 * Implements the full STIX 2.1 specification for cyber threat intelligence
 * interoperability. Supports all SDO (STIX Domain Objects) and SRO
 * (STIX Relationship Objects) types required for intelligence sharing.
 *
 * @see https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html
 */

// ============================================================================
// STIX 2.1 Common Types
// ============================================================================

export type StixIdentifier = `${StixObjectType}--${string}`;

export type StixObjectType =
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
  | 'vulnerability'
  | 'relationship'
  | 'sighting'
  | 'extension-definition'
  | 'marking-definition'
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
  marking_ref?: StixIdentifier;
  selectors: string[];
}

// ============================================================================
// STIX 2.1 Common Properties (SDO/SRO)
// ============================================================================

export interface StixCommonProperties {
  type: StixObjectType;
  spec_version: '2.1';
  id: StixIdentifier;
  created_by_ref?: StixIdentifier;
  created: string;
  modified: string;
  revoked?: boolean;
  labels?: string[];
  confidence?: number;
  lang?: string;
  external_references?: ExternalReference[];
  object_marking_refs?: StixIdentifier[];
  granular_markings?: GranularMarking[];
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
}

export interface Grouping extends StixCommonProperties {
  type: 'grouping';
  name?: string;
  description?: string;
  context: string;
  object_refs: StixIdentifier[];
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
  operating_system_refs?: StixIdentifier[];
  architecture_execution_envs?: string[];
  implementation_languages?: string[];
  capabilities?: string[];
  sample_refs?: StixIdentifier[];
}

export interface MalwareAnalysis extends StixCommonProperties {
  type: 'malware-analysis';
  product: string;
  version?: string;
  host_vm_ref?: StixIdentifier;
  operating_system_ref?: StixIdentifier;
  installed_software_refs?: StixIdentifier[];
  configuration_version?: string;
  modules?: string[];
  analysis_engine_version?: string;
  analysis_definition_version?: string;
  submitted?: string;
  analysis_started?: string;
  analysis_ended?: string;
  result_name?: string;
  result?: string;
  analysis_sco_refs?: StixIdentifier[];
  sample_ref?: StixIdentifier;
  av_result?: string;
}

export interface Note extends StixCommonProperties {
  type: 'note';
  abstract?: string;
  content: string;
  authors?: string[];
  object_refs: StixIdentifier[];
}

export interface ObservedData extends StixCommonProperties {
  type: 'observed-data';
  first_observed: string;
  last_observed: string;
  number_observed: number;
  object_refs?: StixIdentifier[];
}

export interface Opinion extends StixCommonProperties {
  type: 'opinion';
  explanation?: string;
  authors?: string[];
  opinion: 'strongly-disagree' | 'disagree' | 'neutral' | 'agree' | 'strongly-agree';
  object_refs: StixIdentifier[];
}

export interface Report extends StixCommonProperties {
  type: 'report';
  name: string;
  description?: string;
  report_types?: string[];
  published: string;
  object_refs: StixIdentifier[];
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
  source_ref: StixIdentifier;
  target_ref: StixIdentifier;
  start_time?: string;
  stop_time?: string;
}

export interface Sighting extends StixCommonProperties {
  type: 'sighting';
  description?: string;
  first_seen?: string;
  last_seen?: string;
  count?: number;
  sighting_of_ref: StixIdentifier;
  observed_data_refs?: StixIdentifier[];
  where_sighted_refs?: StixIdentifier[];
  summary?: boolean;
}

// ============================================================================
// STIX Meta Objects
// ============================================================================

export interface ExtensionDefinition extends StixCommonProperties {
  type: 'extension-definition';
  name: string;
  description?: string;
  schema: string;
  version: string;
  extension_types: ('new-sdo' | 'new-sco' | 'new-sro' | 'property-extension' | 'toplevel-property-extension')[];
  extension_properties?: string[];
}

export interface MarkingDefinition {
  type: 'marking-definition';
  spec_version: '2.1';
  id: StixIdentifier;
  created_by_ref?: StixIdentifier;
  created: string;
  external_references?: ExternalReference[];
  object_marking_refs?: StixIdentifier[];
  granular_markings?: GranularMarking[];
  extensions?: Record<string, unknown>;
  name?: string;
  definition_type: string;
  definition: Record<string, unknown>;
}

// ============================================================================
// TLP Marking Definitions (Pre-defined)
// ============================================================================

export const TLP_WHITE: MarkingDefinition = {
  type: 'marking-definition',
  spec_version: '2.1',
  id: 'marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9',
  created: '2017-01-20T00:00:00.000Z',
  definition_type: 'tlp',
  name: 'TLP:WHITE',
  definition: { tlp: 'white' },
};

export const TLP_GREEN: MarkingDefinition = {
  type: 'marking-definition',
  spec_version: '2.1',
  id: 'marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da',
  created: '2017-01-20T00:00:00.000Z',
  definition_type: 'tlp',
  name: 'TLP:GREEN',
  definition: { tlp: 'green' },
};

export const TLP_AMBER: MarkingDefinition = {
  type: 'marking-definition',
  spec_version: '2.1',
  id: 'marking-definition--f88d31f6-486f-44da-b317-01333bde0b82',
  created: '2017-01-20T00:00:00.000Z',
  definition_type: 'tlp',
  name: 'TLP:AMBER',
  definition: { tlp: 'amber' },
};

export const TLP_AMBER_STRICT: MarkingDefinition = {
  type: 'marking-definition',
  spec_version: '2.1',
  id: 'marking-definition--826578e1-40ad-459f-bc73-ede076f81f37',
  created: '2022-10-01T00:00:00.000Z',
  definition_type: 'tlp',
  name: 'TLP:AMBER+STRICT',
  definition: { tlp: 'amber+strict' },
};

export const TLP_RED: MarkingDefinition = {
  type: 'marking-definition',
  spec_version: '2.1',
  id: 'marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed',
  created: '2017-01-20T00:00:00.000Z',
  definition_type: 'tlp',
  name: 'TLP:RED',
  definition: { tlp: 'red' },
};

export const TLP_CLEAR: MarkingDefinition = {
  type: 'marking-definition',
  spec_version: '2.1',
  id: 'marking-definition--94868c89-83c2-464b-929b-a1a8aa3c8487',
  created: '2022-10-01T00:00:00.000Z',
  definition_type: 'tlp',
  name: 'TLP:CLEAR',
  definition: { tlp: 'clear' },
};

// ============================================================================
// STIX Bundle
// ============================================================================

export type StixObject =
  | AttackPattern
  | Campaign
  | CourseOfAction
  | Grouping
  | Identity
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
  | Vulnerability
  | Relationship
  | Sighting
  | ExtensionDefinition
  | MarkingDefinition;

export interface StixBundle {
  type: 'bundle';
  id: StixIdentifier;
  objects: StixObject[];
}

// ============================================================================
// IntelGraph CTI Extension
// ============================================================================

export interface IntelGraphExtension {
  extension_type: 'property-extension';
  intelgraph_entity_id: string;
  intelgraph_tenant_id: string;
  intelgraph_investigation_id?: string;
  intelgraph_case_id?: string;
  intelgraph_provenance_id?: string;
  intelgraph_confidence_score?: number;
  intelgraph_classification?: string;
  intelgraph_source_system?: string;
}

export const INTELGRAPH_EXTENSION_ID = 'extension-definition--a932fcc6-e032-176c-126f-cb970a5a1fff';

export const INTELGRAPH_EXTENSION_DEFINITION: ExtensionDefinition = {
  type: 'extension-definition',
  spec_version: '2.1',
  id: INTELGRAPH_EXTENSION_ID as StixIdentifier,
  created: '2025-01-01T00:00:00.000Z',
  modified: '2025-01-01T00:00:00.000Z',
  name: 'IntelGraph Entity Extension',
  description: 'Extension for mapping IntelGraph platform entities to STIX objects with full provenance tracking.',
  schema: 'https://intelgraph.io/schemas/stix-extension/v1.0.0',
  version: '1.0.0',
  extension_types: ['property-extension'],
  extension_properties: [
    'intelgraph_entity_id',
    'intelgraph_tenant_id',
    'intelgraph_investigation_id',
    'intelgraph_case_id',
    'intelgraph_provenance_id',
    'intelgraph_confidence_score',
    'intelgraph_classification',
    'intelgraph_source_system',
  ],
};

// ============================================================================
// Export Configuration Types
// ============================================================================

export type TlpLevel = 'clear' | 'white' | 'green' | 'amber' | 'amber+strict' | 'red';

export interface BundleExportOptions {
  /** Entities to export */
  entityIds: string[];

  /** Include relationships between entities */
  includeRelationships?: boolean;

  /** Maximum depth for relationship traversal */
  relationshipDepth?: number;

  /** TLP marking level */
  tlpLevel?: TlpLevel;

  /** Include IntelGraph extension data */
  includeExtensions?: boolean;

  /** Investigation context */
  investigationId?: string;

  /** Case context */
  caseId?: string;

  /** Producer identity */
  producerName?: string;

  /** Producer identity class */
  producerClass?: 'individual' | 'group' | 'system' | 'organization' | 'class' | 'unknown';

  /** Custom labels */
  labels?: string[];

  /** Include provenance data */
  includeProvenance?: boolean;

  /** Signing key for air-gap transfers */
  signingKey?: string;
}

export interface BundleExportResult {
  bundle: StixBundle;
  metadata: {
    exportedAt: string;
    exportedBy: string;
    entityCount: number;
    relationshipCount: number;
    tlpLevel: TlpLevel;
    signature?: string;
    signatureAlgorithm?: string;
    checksum: string;
  };
}

// ============================================================================
// TAXII 2.1 Types
// ============================================================================

export interface TaxiiDiscovery {
  title: string;
  description?: string;
  contact?: string;
  default?: string;
  api_roots: string[];
}

export interface TaxiiApiRoot {
  title: string;
  description?: string;
  versions: string[];
  max_content_length: number;
}

export interface TaxiiCollection {
  id: string;
  title: string;
  description?: string;
  alias?: string;
  can_read: boolean;
  can_write: boolean;
  media_types?: string[];
}

export interface TaxiiManifest {
  objects: TaxiiManifestEntry[];
}

export interface TaxiiManifestEntry {
  id: StixIdentifier;
  date_added: string;
  version: string;
  media_type?: string;
}

export interface TaxiiEnvelope {
  more?: boolean;
  next?: string;
  objects: StixObject[];
}

export interface TaxiiStatus {
  id: string;
  status: 'pending' | 'complete' | 'failure';
  request_timestamp: string;
  total_count: number;
  success_count: number;
  failure_count: number;
  pending_count: number;
  successes?: StixIdentifier[];
  failures?: Array<{
    id: StixIdentifier;
    message: string;
  }>;
  pendings?: StixIdentifier[];
}

// ============================================================================
// RBAC Permission Types
// ============================================================================

export const CTI_PERMISSIONS = {
  READ: 'cti:read',
  WRITE: 'cti:write',
  EXPORT: 'cti:export',
  SHARE: 'cti:share',
  ADMIN: 'cti:admin',
} as const;

export type CtiPermission = (typeof CTI_PERMISSIONS)[keyof typeof CTI_PERMISSIONS];
