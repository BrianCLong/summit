"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBundle = void 0;
const node_crypto_1 = require("node:crypto");
const LLM_EXTENSION_ID = `extension-definition--${(0, node_crypto_1.randomUUID)()}`;
const SOURCE_IDENTITY_ID = `identity--${(0, node_crypto_1.randomUUID)()}`;
const isoNow = () => new Date().toISOString();
const severityToConfidence = (severity) => {
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
const createExtensionDefinition = () => {
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
    };
};
const createIdentity = (producer) => {
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
    };
};
const extensionPayload = (threat) => {
    const promptHash = (0, node_crypto_1.createHash)('sha256').update(threat.description).digest('base64url');
    const mitigation = threat.metadata?.mitigation ??
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
    };
};
const createAttackPattern = (threat) => {
    const timestamp = isoNow();
    return {
        type: 'attack-pattern',
        id: `attack-pattern--${(0, node_crypto_1.randomUUID)()}`,
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
    };
};
const createIndicator = (threat) => {
    const timestamp = isoNow();
    const tool = threat.metadata?.tool;
    const pattern = tool
        ? `[x-llm-telemetry:tool = '${tool.replace(/'/g, "''")}']`
        : `[x-llm-telemetry:prompt_hash = '${(0, node_crypto_1.createHash)('sha256')
            .update(threat.description)
            .digest('base64url')}']`;
    return {
        type: 'indicator',
        id: `indicator--${(0, node_crypto_1.randomUUID)()}`,
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
    };
};
const createRelationship = (source, target) => {
    const timestamp = isoNow();
    return {
        type: 'relationship',
        id: `relationship--${(0, node_crypto_1.randomUUID)()}`,
        spec_version: '2.1',
        created: timestamp,
        modified: timestamp,
        relationship_type: source.type === 'tool-abuse' ? 'mitigates' : 'describes',
        source_ref: SOURCE_IDENTITY_ID,
        target_ref: target.id
    };
};
const buildBundle = (threats, options = {}) => {
    const producerName = options.producerName ?? 'Model Threat Intelligence Feeds';
    const identity = createIdentity(producerName);
    const extension = createExtensionDefinition();
    const objects = [identity, extension];
    for (const threat of threats) {
        const threatObject = threat.category === 'tool-abuse' ? createIndicator(threat) : createAttackPattern(threat);
        objects.push(threatObject);
        objects.push(createRelationship({ id: threat.id, type: threat.category }, threatObject));
    }
    const bundle = {
        type: 'bundle',
        id: `bundle--${(0, node_crypto_1.randomUUID)()}`,
        spec_version: '2.1',
        objects
    };
    return bundle;
};
exports.buildBundle = buildBundle;
