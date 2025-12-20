import { randomUUID, createHash } from 'node:crypto';
import type {
  AttackPattern,
  ExtensionDefinition,
  Identity,
  Indicator,
  LlmThreat,
  Relationship,
  StixBundle,
  StixObject,
  ThreatCategory
} from '../types.js';

const LLM_EXTENSION_ID = `extension-definition--${randomUUID()}`;
const SOURCE_IDENTITY_ID = `identity--${randomUUID()}`;

const isoNow = (): string => new Date().toISOString();

const severityToConfidence = (severity: LlmThreat['severity']): number => {
  switch (severity) {
    case 'critical':
      return 95;
    case 'high':
      return 85;
    case 'medium':
      return 70;
    default:
      return 50;
  }
};

const createExtensionDefinition = (): ExtensionDefinition => {
  const timestamp = isoNow();
  return {
    type: 'extension-definition',
    id: LLM_EXTENSION_ID,
    created: timestamp,
    modified: timestamp,
    spec_version: '2.1',
    name: 'LLM Threat Context Extension',
    description: 'Captures prompt, jailbreak, and tool telemetry for LLM-focused CTI.',
    schema: 'https://intelgraph.example.com/mtif/extensions/llm-threat.json',
    version: '1.0.0',
    extension_types: ['property-extension'],
    extension_properties: [
      'prompt',
      'llm_family',
      'severity',
      'prompt_hash',
      'jailbreak_pattern',
      'tool',
      'mitigation',
      'response'
    ]
  } satisfies ExtensionDefinition;
};

const createIdentity = (producer: string): Identity => {
  const timestamp = isoNow();
  return {
    type: 'identity',
    id: SOURCE_IDENTITY_ID,
    created: timestamp,
    modified: timestamp,
    spec_version: '2.1',
    name: producer,
    identity_class: 'organization',
    roles: ['data-originator'],
    sectors: ['technology']
  } satisfies Identity;
};

const extensionPayload = (threat: LlmThreat): Record<string, unknown> => {
  const promptHash = createHash('sha256').update(threat.description).digest('base64url');
  const mitigation =
    (threat.metadata?.mitigation as string | undefined) ??
    (threat.category === 'tool-abuse'
      ? 'Disable high-risk tool or require elevated approval.'
      : 'Block prompt and alert guard operators.');

  return {
    prompt: threat.description,
    jailbreak_pattern: threat.metadata?.jailbreak_pattern,
    tool: threat.metadata?.tool,
    llm_family: threat.llm_family,
    severity: threat.severity,
    prompt_hash: promptHash,
    mitigation,
    response: threat.metadata?.response_summary
  } satisfies Record<string, unknown>;
};

const createAttackPattern = (threat: LlmThreat): AttackPattern => {
  const timestamp = isoNow();
  return {
    type: 'attack-pattern',
    id: `attack-pattern--${randomUUID()}`,
    spec_version: '2.1',
    created: timestamp,
    modified: timestamp,
    name: threat.title,
    description: threat.description,
    created_by_ref: SOURCE_IDENTITY_ID,
    confidence: severityToConfidence(threat.severity),
    external_references: [
      {
        source_name: 'mtif-lrt',
        external_id: threat.id,
        description: `Generated from red-team finding at ${threat.observed_at}`
      }
    ],
    labels: ['llm-threat', threat.category],
    extensions: {
      'x-llm-threat-extension': extensionPayload(threat)
    }
  } satisfies AttackPattern;
};

const createIndicator = (threat: LlmThreat): Indicator => {
  const timestamp = isoNow();
  const tool = threat.metadata?.tool as string | undefined;
  const pattern = tool
    ? `[x-llm-telemetry:tool = '${tool.replace(/'/g, "''")}']`
    : `[x-llm-telemetry:prompt_hash = '${createHash('sha256')
        .update(threat.description)
        .digest('base64url')}']`;

  return {
    type: 'indicator',
    id: `indicator--${randomUUID()}`,
    spec_version: '2.1',
    created: timestamp,
    modified: timestamp,
    name: threat.title,
    description: threat.description,
    pattern,
    pattern_type: 'stix',
    valid_from: threat.observed_at,
    created_by_ref: SOURCE_IDENTITY_ID,
    confidence: severityToConfidence(threat.severity),
    labels: ['llm-threat', threat.category],
    extensions: {
      'x-llm-threat-extension': extensionPayload(threat)
    }
  } satisfies Indicator;
};

const createRelationship = (
  source: { id: string; type: ThreatCategory },
  target: { id: string }
): Relationship => {
  const timestamp = isoNow();
  return {
    type: 'relationship',
    id: `relationship--${randomUUID()}`,
    spec_version: '2.1',
    created: timestamp,
    modified: timestamp,
    relationship_type: source.type === 'tool-abuse' ? 'mitigates' : 'describes',
    source_ref: SOURCE_IDENTITY_ID,
    target_ref: target.id
  } satisfies Relationship;
};

export interface BundleFactoryOptions {
  producerName?: string;
}

export const buildBundle = (threats: LlmThreat[], options: BundleFactoryOptions = {}): StixBundle => {
  const producerName = options.producerName ?? 'Model Threat Intelligence Feeds';
  const identity = createIdentity(producerName);
  const extension = createExtensionDefinition();

  const objects: StixObject[] = [identity, extension];

  for (const threat of threats) {
    const threatObject = threat.category === 'tool-abuse' ? createIndicator(threat) : createAttackPattern(threat);
    objects.push(threatObject);
    objects.push(createRelationship({ id: threat.id, type: threat.category }, threatObject));
  }

  const bundle: StixBundle = {
    type: 'bundle',
    id: `bundle--${randomUUID()}`,
    spec_version: '2.1',
    objects
  };

  return bundle;
};
