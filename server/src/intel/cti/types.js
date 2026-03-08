"use strict";
/**
 * STIX 2.1 Type Definitions for IntelGraph CTI Export
 *
 * Implements the full STIX 2.1 specification for cyber threat intelligence
 * interoperability. Supports all SDO (STIX Domain Objects) and SRO
 * (STIX Relationship Objects) types required for intelligence sharing.
 *
 * @see https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTI_PERMISSIONS = exports.INTELGRAPH_EXTENSION_DEFINITION = exports.INTELGRAPH_EXTENSION_ID = exports.TLP_CLEAR = exports.TLP_RED = exports.TLP_AMBER_STRICT = exports.TLP_AMBER = exports.TLP_GREEN = exports.TLP_WHITE = void 0;
// ============================================================================
// TLP Marking Definitions (Pre-defined)
// ============================================================================
exports.TLP_WHITE = {
    type: 'marking-definition',
    spec_version: '2.1',
    id: 'marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9',
    created: '2017-01-20T00:00:00.000Z',
    definition_type: 'tlp',
    name: 'TLP:WHITE',
    definition: { tlp: 'white' },
};
exports.TLP_GREEN = {
    type: 'marking-definition',
    spec_version: '2.1',
    id: 'marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da',
    created: '2017-01-20T00:00:00.000Z',
    definition_type: 'tlp',
    name: 'TLP:GREEN',
    definition: { tlp: 'green' },
};
exports.TLP_AMBER = {
    type: 'marking-definition',
    spec_version: '2.1',
    id: 'marking-definition--f88d31f6-486f-44da-b317-01333bde0b82',
    created: '2017-01-20T00:00:00.000Z',
    definition_type: 'tlp',
    name: 'TLP:AMBER',
    definition: { tlp: 'amber' },
};
exports.TLP_AMBER_STRICT = {
    type: 'marking-definition',
    spec_version: '2.1',
    id: 'marking-definition--826578e1-40ad-459f-bc73-ede076f81f37',
    created: '2022-10-01T00:00:00.000Z',
    definition_type: 'tlp',
    name: 'TLP:AMBER+STRICT',
    definition: { tlp: 'amber+strict' },
};
exports.TLP_RED = {
    type: 'marking-definition',
    spec_version: '2.1',
    id: 'marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed',
    created: '2017-01-20T00:00:00.000Z',
    definition_type: 'tlp',
    name: 'TLP:RED',
    definition: { tlp: 'red' },
};
exports.TLP_CLEAR = {
    type: 'marking-definition',
    spec_version: '2.1',
    id: 'marking-definition--94868c89-83c2-464b-929b-a1a8aa3c8487',
    created: '2022-10-01T00:00:00.000Z',
    definition_type: 'tlp',
    name: 'TLP:CLEAR',
    definition: { tlp: 'clear' },
};
exports.INTELGRAPH_EXTENSION_ID = 'extension-definition--a932fcc6-e032-176c-126f-cb970a5a1fff';
exports.INTELGRAPH_EXTENSION_DEFINITION = {
    type: 'extension-definition',
    spec_version: '2.1',
    id: exports.INTELGRAPH_EXTENSION_ID,
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
// RBAC Permission Types
// ============================================================================
exports.CTI_PERMISSIONS = {
    READ: 'cti:read',
    WRITE: 'cti:write',
    EXPORT: 'cti:export',
    SHARE: 'cti:share',
    ADMIN: 'cti:admin',
};
