/**
 * Entity Mapper - IntelGraph to STIX 2.1 Conversion
 *
 * Maps IntelGraph platform entities to their corresponding STIX 2.1
 * Domain Objects (SDOs) and Relationship Objects (SROs).
 */

import { randomUUID } from 'node:crypto';
import type { Entity } from '../../repos/EntityRepo.js';
import type {
  StixIdentifier,
  StixObject,
  Identity,
  ThreatActor,
  Campaign,
  AttackPattern,
  Indicator,
  Malware,
  Tool,
  Vulnerability,
  Infrastructure,
  IntrusionSet,
  Location,
  Report,
  Note,
  Relationship,
  Sighting,
  IntelGraphExtension,
  TlpLevel,
  MarkingDefinition,
} from './types.js';
import {
  INTELGRAPH_EXTENSION_ID,
  TLP_WHITE,
  TLP_GREEN,
  TLP_AMBER,
  TLP_AMBER_STRICT,
  TLP_RED,
  TLP_CLEAR,
} from './types.js';

// ============================================================================
// Utility Functions
// ============================================================================

const isoNow = (): string => new Date().toISOString();

const generateStixId = (type: string): StixIdentifier =>
  `${type}--${randomUUID()}` as StixIdentifier;

const toIsoString = (date: Date | string | undefined): string => {
  if (!date) return isoNow();
  if (typeof date === 'string') return date;
  return date.toISOString();
};

// ============================================================================
// TLP Marking Resolution
// ============================================================================

export function getTlpMarking(level: TlpLevel): MarkingDefinition {
  switch (level) {
    case 'clear':
      return TLP_CLEAR;
    case 'white':
      return TLP_WHITE;
    case 'green':
      return TLP_GREEN;
    case 'amber':
      return TLP_AMBER;
    case 'amber+strict':
      return TLP_AMBER_STRICT;
    case 'red':
      return TLP_RED;
    default:
      return TLP_GREEN;
  }
}

export function getTlpMarkingRef(level: TlpLevel): StixIdentifier {
  return getTlpMarking(level).id;
}

// ============================================================================
// IntelGraph Extension Builder
// ============================================================================

export function buildIntelGraphExtension(
  entity: Entity,
  options: {
    investigationId?: string;
    caseId?: string;
    provenanceId?: string;
    confidenceScore?: number;
    classification?: string;
  } = {},
): Record<string, IntelGraphExtension> {
  return {
    [INTELGRAPH_EXTENSION_ID]: {
      extension_type: 'property-extension',
      intelgraph_entity_id: entity.id,
      intelgraph_tenant_id: entity.tenantId,
      intelgraph_investigation_id: options.investigationId,
      intelgraph_case_id: options.caseId,
      intelgraph_provenance_id: options.provenanceId,
      intelgraph_confidence_score: options.confidenceScore,
      intelgraph_classification: options.classification,
      intelgraph_source_system: 'intelgraph',
    },
  };
}

// ============================================================================
// Entity Type Mapping
// ============================================================================

export type IntelGraphEntityKind =
  | 'person'
  | 'organization'
  | 'threat-actor'
  | 'campaign'
  | 'attack-pattern'
  | 'indicator'
  | 'malware'
  | 'tool'
  | 'vulnerability'
  | 'infrastructure'
  | 'intrusion-set'
  | 'location'
  | 'report'
  | 'note'
  | 'asset'
  | 'event'
  | 'document'
  | 'claim'
  | 'case';

const KIND_TO_STIX_TYPE: Record<string, string> = {
  person: 'identity',
  organization: 'identity',
  'threat-actor': 'threat-actor',
  campaign: 'campaign',
  'attack-pattern': 'attack-pattern',
  indicator: 'indicator',
  malware: 'malware',
  tool: 'tool',
  vulnerability: 'vulnerability',
  infrastructure: 'infrastructure',
  'intrusion-set': 'intrusion-set',
  location: 'location',
  report: 'report',
  note: 'note',
  asset: 'infrastructure',
  event: 'observed-data',
  document: 'note',
  claim: 'note',
  case: 'report',
};

// ============================================================================
// Entity Mappers
// ============================================================================

interface MapperContext {
  producerRef?: StixIdentifier;
  tlpMarkingRef?: StixIdentifier;
  labels?: string[];
  includeExtensions?: boolean;
  investigationId?: string;
  caseId?: string;
}

function mapToIdentity(entity: Entity, ctx: MapperContext): Identity {
  const timestamp = isoNow();
  const props = entity.props || {};

  const identityClass = entity.kind === 'organization' ? 'organization' : 'individual';

  return {
    type: 'identity',
    spec_version: '2.1',
    id: generateStixId('identity'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0] || 'Unknown',
    description: props.description,
    identity_class: identityClass,
    sectors: props.sectors,
    roles: props.roles,
    contact_information: props.contactInfo || props.email,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
          confidenceScore: props.confidence,
        })
      : undefined,
  };
}

function mapToThreatActor(entity: Entity, ctx: MapperContext): ThreatActor {
  const props = entity.props || {};

  return {
    type: 'threat-actor',
    spec_version: '2.1',
    id: generateStixId('threat-actor'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0] || 'Unknown Threat Actor',
    description: props.description,
    threat_actor_types: props.threat_actor_types || props.types,
    aliases: props.aliases,
    first_seen: props.first_seen || props.firstSeen,
    last_seen: props.last_seen || props.lastSeen,
    roles: props.roles,
    goals: props.goals,
    sophistication: props.sophistication,
    resource_level: props.resource_level || props.resourceLevel,
    primary_motivation: props.primary_motivation || props.motivation,
    secondary_motivations: props.secondary_motivations,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
          confidenceScore: props.confidence,
        })
      : undefined,
  };
}

function mapToCampaign(entity: Entity, ctx: MapperContext): Campaign {
  const props = entity.props || {};

  return {
    type: 'campaign',
    spec_version: '2.1',
    id: generateStixId('campaign'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0] || 'Unknown Campaign',
    description: props.description,
    aliases: props.aliases,
    first_seen: props.first_seen || props.firstSeen,
    last_seen: props.last_seen || props.lastSeen,
    objective: props.objective,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

function mapToAttackPattern(entity: Entity, ctx: MapperContext): AttackPattern {
  const props = entity.props || {};

  return {
    type: 'attack-pattern',
    spec_version: '2.1',
    id: generateStixId('attack-pattern'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0] || 'Unknown Attack Pattern',
    description: props.description,
    aliases: props.aliases,
    kill_chain_phases: props.kill_chain_phases || props.killChainPhases,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

function mapToIndicator(entity: Entity, ctx: MapperContext): Indicator {
  const props = entity.props || {};

  // Build STIX pattern if not provided
  let pattern = props.pattern;
  if (!pattern) {
    const iocType = props.ioc_type || props.type;
    const iocValue = props.ioc_value || props.value;
    if (iocType && iocValue) {
      pattern = buildStixPattern(iocType, iocValue);
    } else {
      pattern = "[file:name = 'unknown']"; // Fallback pattern
    }
  }

  return {
    type: 'indicator',
    spec_version: '2.1',
    id: generateStixId('indicator'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0],
    description: props.description,
    indicator_types: props.indicator_types || props.indicatorTypes,
    pattern,
    pattern_type: props.pattern_type || props.patternType || 'stix',
    pattern_version: props.pattern_version,
    valid_from: props.valid_from || props.validFrom || toIsoString(entity.createdAt),
    valid_until: props.valid_until || props.validUntil,
    kill_chain_phases: props.kill_chain_phases,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
          confidenceScore: props.confidence,
        })
      : undefined,
  };
}

function mapToMalware(entity: Entity, ctx: MapperContext): Malware {
  const props = entity.props || {};

  return {
    type: 'malware',
    spec_version: '2.1',
    id: generateStixId('malware'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0],
    description: props.description,
    malware_types: props.malware_types || props.malwareTypes,
    is_family: props.is_family ?? props.isFamily ?? false,
    aliases: props.aliases,
    kill_chain_phases: props.kill_chain_phases,
    first_seen: props.first_seen || props.firstSeen,
    last_seen: props.last_seen || props.lastSeen,
    architecture_execution_envs: props.architecture_execution_envs,
    implementation_languages: props.implementation_languages,
    capabilities: props.capabilities,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

function mapToTool(entity: Entity, ctx: MapperContext): Tool {
  const props = entity.props || {};

  return {
    type: 'tool',
    spec_version: '2.1',
    id: generateStixId('tool'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0] || 'Unknown Tool',
    description: props.description,
    tool_types: props.tool_types || props.toolTypes,
    aliases: props.aliases,
    kill_chain_phases: props.kill_chain_phases,
    tool_version: props.tool_version || props.version,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

function mapToVulnerability(entity: Entity, ctx: MapperContext): Vulnerability {
  const props = entity.props || {};

  return {
    type: 'vulnerability',
    spec_version: '2.1',
    id: generateStixId('vulnerability'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.cve || props.label || entity.labels?.[0] || 'Unknown Vulnerability',
    description: props.description,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references || (props.cve
      ? [{
          source_name: 'cve',
          external_id: props.cve,
          url: `https://nvd.nist.gov/vuln/detail/${props.cve}`,
        }]
      : undefined),
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

function mapToInfrastructure(entity: Entity, ctx: MapperContext): Infrastructure {
  const props = entity.props || {};

  return {
    type: 'infrastructure',
    spec_version: '2.1',
    id: generateStixId('infrastructure'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0] || 'Unknown Infrastructure',
    description: props.description,
    infrastructure_types: props.infrastructure_types || props.types,
    aliases: props.aliases,
    kill_chain_phases: props.kill_chain_phases,
    first_seen: props.first_seen || props.firstSeen,
    last_seen: props.last_seen || props.lastSeen,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

function mapToIntrusionSet(entity: Entity, ctx: MapperContext): IntrusionSet {
  const props = entity.props || {};

  return {
    type: 'intrusion-set',
    spec_version: '2.1',
    id: generateStixId('intrusion-set'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0] || 'Unknown Intrusion Set',
    description: props.description,
    aliases: props.aliases,
    first_seen: props.first_seen || props.firstSeen,
    last_seen: props.last_seen || props.lastSeen,
    goals: props.goals,
    resource_level: props.resource_level || props.resourceLevel,
    primary_motivation: props.primary_motivation || props.motivation,
    secondary_motivations: props.secondary_motivations,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

function mapToLocation(entity: Entity, ctx: MapperContext): Location {
  const props = entity.props || {};

  return {
    type: 'location',
    spec_version: '2.1',
    id: generateStixId('location'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.label || entity.labels?.[0],
    description: props.description,
    latitude: props.latitude || props.lat,
    longitude: props.longitude || props.lng || props.lon,
    precision: props.precision,
    region: props.region,
    country: props.country,
    administrative_area: props.administrative_area || props.state || props.province,
    city: props.city,
    street_address: props.street_address || props.address,
    postal_code: props.postal_code || props.postalCode || props.zip,
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

function mapToReport(entity: Entity, ctx: MapperContext): Report {
  const props = entity.props || {};

  return {
    type: 'report',
    spec_version: '2.1',
    id: generateStixId('report'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    name: props.name || props.title || props.label || entity.labels?.[0] || 'Untitled Report',
    description: props.description || props.summary,
    report_types: props.report_types || props.reportTypes,
    published: props.published || toIsoString(entity.createdAt),
    object_refs: props.object_refs || [],
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

function mapToNote(entity: Entity, ctx: MapperContext): Note {
  const props = entity.props || {};

  return {
    type: 'note',
    spec_version: '2.1',
    id: generateStixId('note'),
    created: toIsoString(entity.createdAt),
    modified: toIsoString(entity.updatedAt),
    abstract: props.abstract || props.title || props.name,
    content: props.content || props.description || props.text || '',
    authors: props.authors,
    object_refs: props.object_refs || [],
    labels: [...(entity.labels || []), ...(ctx.labels || [])],
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
    confidence: props.confidence,
    external_references: props.external_references,
    extensions: ctx.includeExtensions
      ? buildIntelGraphExtension(entity, {
          investigationId: ctx.investigationId,
          caseId: ctx.caseId,
        })
      : undefined,
  };
}

// ============================================================================
// STIX Pattern Builder
// ============================================================================

function buildStixPattern(iocType: string, value: string): string {
  const escapedValue = value.replace(/'/g, "\\'");

  switch (iocType.toLowerCase()) {
    case 'ip':
    case 'ipv4':
    case 'ipv4-addr':
      return `[ipv4-addr:value = '${escapedValue}']`;
    case 'ipv6':
    case 'ipv6-addr':
      return `[ipv6-addr:value = '${escapedValue}']`;
    case 'domain':
    case 'domain-name':
      return `[domain-name:value = '${escapedValue}']`;
    case 'url':
      return `[url:value = '${escapedValue}']`;
    case 'email':
    case 'email-addr':
      return `[email-addr:value = '${escapedValue}']`;
    case 'hash':
    case 'md5':
      return `[file:hashes.MD5 = '${escapedValue}']`;
    case 'sha1':
      return `[file:hashes.'SHA-1' = '${escapedValue}']`;
    case 'sha256':
      return `[file:hashes.'SHA-256' = '${escapedValue}']`;
    case 'sha512':
      return `[file:hashes.'SHA-512' = '${escapedValue}']`;
    case 'filename':
    case 'file':
      return `[file:name = '${escapedValue}']`;
    case 'registry':
    case 'windows-registry-key':
      return `[windows-registry-key:key = '${escapedValue}']`;
    case 'mutex':
      return `[mutex:name = '${escapedValue}']`;
    case 'mac':
    case 'mac-addr':
      return `[mac-addr:value = '${escapedValue}']`;
    case 'user-agent':
      return `[network-traffic:extensions.'http-request-ext'.request_header.'User-Agent' = '${escapedValue}']`;
    default:
      return `[x-custom-ioc:value = '${escapedValue}' AND x-custom-ioc:type = '${iocType}']`;
  }
}

// ============================================================================
// Main Entity Mapper
// ============================================================================

export interface EntityMappingResult {
  stixObject: StixObject;
  originalEntityId: string;
  stixId: StixIdentifier;
  stixType: string;
}

export function mapEntityToStix(
  entity: Entity,
  ctx: MapperContext = {},
): EntityMappingResult {
  const kind = entity.kind?.toLowerCase() || 'unknown';

  let stixObject: StixObject;

  switch (kind) {
    case 'person':
    case 'organization':
      stixObject = mapToIdentity(entity, ctx);
      break;
    case 'threat-actor':
    case 'threat_actor':
    case 'threatactor':
      stixObject = mapToThreatActor(entity, ctx);
      break;
    case 'campaign':
      stixObject = mapToCampaign(entity, ctx);
      break;
    case 'attack-pattern':
    case 'attack_pattern':
    case 'attackpattern':
      stixObject = mapToAttackPattern(entity, ctx);
      break;
    case 'indicator':
    case 'ioc':
      stixObject = mapToIndicator(entity, ctx);
      break;
    case 'malware':
      stixObject = mapToMalware(entity, ctx);
      break;
    case 'tool':
      stixObject = mapToTool(entity, ctx);
      break;
    case 'vulnerability':
    case 'cve':
      stixObject = mapToVulnerability(entity, ctx);
      break;
    case 'infrastructure':
    case 'asset':
      stixObject = mapToInfrastructure(entity, ctx);
      break;
    case 'intrusion-set':
    case 'intrusion_set':
    case 'intrusionset':
      stixObject = mapToIntrusionSet(entity, ctx);
      break;
    case 'location':
      stixObject = mapToLocation(entity, ctx);
      break;
    case 'report':
    case 'case':
      stixObject = mapToReport(entity, ctx);
      break;
    case 'note':
    case 'document':
    case 'claim':
    case 'event':
    default:
      stixObject = mapToNote(entity, ctx);
      break;
  }

  return {
    stixObject,
    originalEntityId: entity.id,
    stixId: stixObject.id,
    stixType: stixObject.type,
  };
}

// ============================================================================
// Relationship Mapper
// ============================================================================

export interface RelationshipInput {
  sourceEntityId: string;
  sourceStixId: StixIdentifier;
  targetEntityId: string;
  targetStixId: StixIdentifier;
  relationshipType: string;
  description?: string;
  startTime?: string;
  stopTime?: string;
  confidence?: number;
}

export function createRelationship(
  input: RelationshipInput,
  ctx: MapperContext = {},
): Relationship {
  return {
    type: 'relationship',
    spec_version: '2.1',
    id: generateStixId('relationship'),
    created: isoNow(),
    modified: isoNow(),
    relationship_type: normalizeRelationshipType(input.relationshipType),
    source_ref: input.sourceStixId,
    target_ref: input.targetStixId,
    description: input.description,
    start_time: input.startTime,
    stop_time: input.stopTime,
    confidence: input.confidence,
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
  };
}

function normalizeRelationshipType(type: string): string {
  // Map common IntelGraph relationship types to STIX vocabulary
  const mappings: Record<string, string> = {
    'RELATED_TO': 'related-to',
    'AFFILIATED_WITH': 'related-to',
    'SUBSIDIARY_OF': 'related-to',
    'HAS_KEY_PERSON': 'related-to',
    'OCCURRED_AT': 'located-at',
    'HAS_PARTICIPANT': 'related-to',
    'USES': 'uses',
    'TARGETS': 'targets',
    'INDICATES': 'indicates',
    'ATTRIBUTED_TO': 'attributed-to',
    'COMPROMISES': 'compromises',
    'DELIVERS': 'delivers',
    'DROPS': 'drops',
    'EXPLOITS': 'exploits',
    'VARIANT_OF': 'variant-of',
    'COMMUNICATES_WITH': 'communicates-with',
    'CONTROLS': 'controls',
    'OWNS': 'owns',
    'AUTHORED_BY': 'authored-by',
    'BASED_ON': 'based-on',
    'CONSISTS_OF': 'consists-of',
    'DERIVED_FROM': 'derived-from',
    'DUPLICATE_OF': 'duplicate-of',
    'HOSTS': 'hosts',
    'LOCATED_AT': 'located-at',
    'ORIGINATES_FROM': 'originates-from',
  };

  const normalized = mappings[type.toUpperCase()] || type.toLowerCase().replace(/_/g, '-');
  return normalized;
}

// ============================================================================
// Sighting Mapper
// ============================================================================

export interface SightingInput {
  sightingOfRef: StixIdentifier;
  whereSightedRefs?: StixIdentifier[];
  observedDataRefs?: StixIdentifier[];
  firstSeen?: string;
  lastSeen?: string;
  count?: number;
  description?: string;
  confidence?: number;
}

export function createSighting(
  input: SightingInput,
  ctx: MapperContext = {},
): Sighting {
  return {
    type: 'sighting',
    spec_version: '2.1',
    id: generateStixId('sighting'),
    created: isoNow(),
    modified: isoNow(),
    sighting_of_ref: input.sightingOfRef,
    where_sighted_refs: input.whereSightedRefs,
    observed_data_refs: input.observedDataRefs,
    first_seen: input.firstSeen,
    last_seen: input.lastSeen,
    count: input.count,
    description: input.description,
    confidence: input.confidence,
    created_by_ref: ctx.producerRef,
    object_marking_refs: ctx.tlpMarkingRef ? [ctx.tlpMarkingRef] : undefined,
  };
}

// ============================================================================
// Producer Identity Factory
// ============================================================================

export function createProducerIdentity(
  name: string,
  identityClass: 'individual' | 'group' | 'system' | 'organization' | 'class' | 'unknown' = 'organization',
): Identity {
  return {
    type: 'identity',
    spec_version: '2.1',
    id: generateStixId('identity'),
    created: isoNow(),
    modified: isoNow(),
    name,
    identity_class: identityClass,
    sectors: ['technology'],
    roles: ['data-originator'],
  };
}
