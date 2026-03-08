"use strict";
/**
 * STIX/TAXII Protocol Mapping
 *
 * Provides interoperability with STIX 2.1 and TAXII 2.1 standards.
 * Maps IntelGraph objects to STIX Domain Objects (SDOs).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stixTaxiiMapper = exports.StixTaxiiMapper = void 0;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("../models/types.js");
const logger = (0, pino_1.default)({ name: 'stix-taxii' });
/**
 * STIX/TAXII Mapper
 */
class StixTaxiiMapper {
    /**
     * Convert SharedObject to STIX object
     */
    toStix(obj) {
        logger.debug({
            objectId: obj.id,
            objectType: obj.type,
        }, 'Converting to STIX');
        const stixId = `${this.getStixType(obj.type)}--${(0, uuid_1.v4)()}`;
        const base = {
            type: this.getStixType(obj.type),
            spec_version: '2.1',
            id: stixId,
            created: obj.createdAt.toISOString(),
            modified: obj.modifiedAt?.toISOString() || obj.createdAt.toISOString(),
            labels: this.getLabels(obj),
            external_references: [
                {
                    source_name: 'IntelGraph',
                    external_id: obj.originalId,
                    description: `Original ID: ${obj.originalId}`,
                },
            ],
            object_marking_refs: this.getMarkingRefs(obj),
        };
        // Add type-specific fields
        switch (obj.type) {
            case types_js_1.ShareableObjectType.IOC:
                return this.toStixIndicator(obj, base);
            case types_js_1.ShareableObjectType.ENTITY:
                return this.toStixIdentity(obj, base);
            case types_js_1.ShareableObjectType.RELATIONSHIP:
                return this.toStixRelationship(obj, base);
            default:
                // Generic mapping
                return {
                    ...base,
                    ...obj.data,
                };
        }
    }
    /**
     * Convert to STIX Indicator
     */
    toStixIndicator(obj, base) {
        const data = obj.data;
        return {
            ...base,
            type: 'indicator',
            pattern: data.pattern || `[file:hashes.MD5 = '${data.hash || 'unknown'}']`,
            pattern_type: data.patternType || 'stix',
            valid_from: data.validFrom || obj.createdAt.toISOString(),
            valid_until: data.validUntil,
            indicator_types: data.indicatorTypes || ['malicious-activity'],
            name: data.name,
            description: data.description,
        };
    }
    /**
     * Convert to STIX Identity
     */
    toStixIdentity(obj, base) {
        const data = obj.data;
        return {
            ...base,
            type: 'identity',
            name: data.name || 'Unknown',
            identity_class: data.identityClass || 'individual',
            sectors: data.sectors,
            contact_information: data.contactInfo,
        };
    }
    /**
     * Convert to STIX Relationship
     */
    toStixRelationship(obj, base) {
        const data = obj.data;
        return {
            ...base,
            type: 'relationship',
            relationship_type: data.relationshipType || 'related-to',
            source_ref: data.sourceRef || 'unknown',
            target_ref: data.targetRef || 'unknown',
            description: data.description,
        };
    }
    /**
     * Map IntelGraph object type to STIX type
     */
    getStixType(type) {
        const mapping = {
            [types_js_1.ShareableObjectType.IOC]: 'indicator',
            [types_js_1.ShareableObjectType.ENTITY]: 'identity',
            [types_js_1.ShareableObjectType.RELATIONSHIP]: 'relationship',
            [types_js_1.ShareableObjectType.ALERT]: 'incident',
            [types_js_1.ShareableObjectType.CASE]: 'incident',
            [types_js_1.ShareableObjectType.DOCUMENT]: 'note',
            [types_js_1.ShareableObjectType.ANALYSIS]: 'report',
        };
        return mapping[type] || 'x-custom-object';
    }
    /**
     * Get STIX labels from object
     */
    getLabels(obj) {
        const labels = [];
        labels.push(`classification:${obj.classification.toLowerCase()}`);
        labels.push(`jurisdiction:${obj.jurisdiction.toLowerCase()}`);
        labels.push(`license:${obj.license.toLowerCase()}`);
        if (obj.redactedFields && obj.redactedFields.length > 0) {
            labels.push('redacted');
        }
        return labels;
    }
    /**
     * Get STIX marking refs from object
     */
    getMarkingRefs(obj) {
        const refs = [];
        // Map classification to TLP
        switch (obj.classification) {
            case types_js_1.ClassificationLevel.UNCLASSIFIED:
                refs.push('marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9'); // TLP:WHITE
                break;
            case types_js_1.ClassificationLevel.CUI:
                refs.push('marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da'); // TLP:GREEN
                break;
            case types_js_1.ClassificationLevel.CONFIDENTIAL:
            case types_js_1.ClassificationLevel.SECRET:
                refs.push('marking-definition--f88d31f6-486f-44da-b317-01333bde0b82'); // TLP:AMBER
                break;
            case types_js_1.ClassificationLevel.TOP_SECRET:
                refs.push('marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed'); // TLP:RED
                break;
        }
        return refs;
    }
    /**
     * Convert SharePackage to STIX Bundle
     */
    toStixBundle(pkg) {
        logger.info({
            packageId: pkg.id,
            objectCount: pkg.objects.length,
        }, 'Converting package to STIX bundle');
        const stixObjects = pkg.objects.map((obj) => this.toStix(obj));
        const bundle = {
            type: 'bundle',
            id: `bundle--${(0, uuid_1.v4)()}`,
            objects: stixObjects,
        };
        return bundle;
    }
    /**
     * Convert STIX object to SharedObject
     */
    fromStix(stixObj) {
        logger.debug({
            stixId: stixObj.id,
            stixType: stixObj.type,
        }, 'Converting from STIX');
        // Extract original ID from external references
        const originalId = stixObj.external_references?.find((ref) => ref.source_name === 'IntelGraph')
            ?.external_id || stixObj.id;
        // Parse labels
        const labels = stixObj.labels || [];
        const classification = this.parseClassificationFromLabels(labels);
        const jurisdiction = this.parseJurisdictionFromLabels(labels);
        const license = this.parseLicenseFromLabels(labels);
        // Map STIX type to IntelGraph type
        const objectType = this.fromStixType(stixObj.type);
        const sharedObj = {
            id: (0, uuid_1.v4)(),
            type: objectType,
            data: this.extractData(stixObj),
            classification,
            jurisdiction,
            license,
            originalId,
            sourceOrganization: 'external',
            createdAt: new Date(stixObj.created),
            modifiedAt: stixObj.modified ? new Date(stixObj.modified) : undefined,
            redactedFields: labels.includes('redacted') ? ['unknown'] : undefined,
            transformationApplied: labels.includes('redacted'),
        };
        return sharedObj;
    }
    /**
     * Map STIX type to IntelGraph type
     */
    fromStixType(stixType) {
        const mapping = {
            indicator: types_js_1.ShareableObjectType.IOC,
            identity: types_js_1.ShareableObjectType.ENTITY,
            relationship: types_js_1.ShareableObjectType.RELATIONSHIP,
            incident: types_js_1.ShareableObjectType.ALERT,
            note: types_js_1.ShareableObjectType.DOCUMENT,
            report: types_js_1.ShareableObjectType.ANALYSIS,
        };
        return mapping[stixType] || types_js_1.ShareableObjectType.ENTITY;
    }
    /**
     * Extract data from STIX object
     */
    extractData(stixObj) {
        const data = {};
        // Copy all non-standard fields
        const standardFields = [
            'type',
            'spec_version',
            'id',
            'created',
            'modified',
            'created_by_ref',
            'labels',
            'confidence',
            'lang',
            'external_references',
            'object_marking_refs',
            'granular_markings',
        ];
        for (const [key, value] of Object.entries(stixObj)) {
            if (!standardFields.includes(key)) {
                data[key] = value;
            }
        }
        return data;
    }
    /**
     * Parse classification from labels
     */
    parseClassificationFromLabels(labels) {
        const classLabel = labels.find((l) => l.startsWith('classification:'));
        if (classLabel) {
            const level = classLabel.split(':')[1].toUpperCase();
            return level || types_js_1.ClassificationLevel.UNCLASSIFIED;
        }
        return types_js_1.ClassificationLevel.UNCLASSIFIED;
    }
    /**
     * Parse jurisdiction from labels
     */
    parseJurisdictionFromLabels(labels) {
        const jurisdictionLabel = labels.find((l) => l.startsWith('jurisdiction:'));
        if (jurisdictionLabel) {
            return jurisdictionLabel.split(':')[1].toUpperCase();
        }
        return 'GLOBAL';
    }
    /**
     * Parse license from labels
     */
    parseLicenseFromLabels(labels) {
        const licenseLabel = labels.find((l) => l.startsWith('license:'));
        if (licenseLabel) {
            return licenseLabel.split(':')[1].toUpperCase();
        }
        return 'TLP:WHITE';
    }
    /**
     * Create TAXII envelope
     */
    createTaxiiEnvelope(objects, more = false) {
        return {
            more,
            objects,
        };
    }
}
exports.StixTaxiiMapper = StixTaxiiMapper;
exports.stixTaxiiMapper = new StixTaxiiMapper();
