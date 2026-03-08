"use strict";
/**
 * Canonical Entity Mapper
 *
 * Maps source records to canonical entity format.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanonicalMapper = void 0;
const pii_detection_1 = require("./pii-detection");
/**
 * Canonical Entity Mapper
 */
class CanonicalMapper {
    /**
     * Map a record to canonical format
     */
    mapToCanonical(record, config, recordIndex) {
        const props = {};
        let piiRedacted = false;
        // Apply field mappings
        for (const mapping of config.fieldMappings) {
            const sourceValue = record[mapping.sourceField];
            if (sourceValue !== undefined && sourceValue !== null) {
                let mappedValue = sourceValue;
                // Apply redaction if configured
                if (config.redactionRules && config.redactionRules[mapping.sourceField]) {
                    const strategy = config.redactionRules[mapping.sourceField];
                    if (typeof sourceValue === 'string') {
                        mappedValue = pii_detection_1.PIIDetection.redact(sourceValue, strategy);
                        piiRedacted = true;
                    }
                }
                // Apply transformation if specified
                if (mapping.transformation) {
                    mappedValue = this.applyTransformation(mappedValue, mapping.transformation);
                }
                // Set property
                if (mapping.targetField.startsWith('props.')) {
                    const propName = mapping.targetField.substring(6);
                    props[propName] = mappedValue;
                }
                else {
                    props[mapping.targetField] = mappedValue;
                }
            }
        }
        // Include unmapped fields as custom properties
        for (const [key, value] of Object.entries(record)) {
            const isMapped = config.fieldMappings.some((m) => m.sourceField === key);
            if (!isMapped && value !== undefined && value !== null) {
                props[key] = value;
            }
        }
        // Generate external ID
        const externalId = this.generateExternalId(config.connectorId, config.sourceId, record, recordIndex);
        return {
            type: config.entityType,
            externalId,
            props,
            confidence: this.calculateConfidence(config.fieldMappings, record),
            sourceMeta: {
                connectorId: config.connectorId,
                sourceId: config.sourceId,
                licenseId: config.licenseId,
                ingestedAt: new Date().toISOString(),
                piiRedacted,
            },
        };
    }
    /**
     * Map multiple records to canonical format
     */
    mapRecords(records, config) {
        return records.map((record, index) => this.mapToCanonical(record, config, index));
    }
    /**
     * Apply transformation to a value
     */
    applyTransformation(value, transformation) {
        // Simple transformations (can be extended)
        switch (transformation) {
            case 'uppercase':
                return typeof value === 'string' ? value.toUpperCase() : value;
            case 'lowercase':
                return typeof value === 'string' ? value.toLowerCase() : value;
            case 'trim':
                return typeof value === 'string' ? value.trim() : value;
            case 'number':
                return typeof value === 'string' ? parseFloat(value) : value;
            case 'string':
                return String(value);
            case 'date':
                return typeof value === 'string' ? new Date(value).toISOString() : value;
            default:
                return value;
        }
    }
    /**
     * Generate external ID
     */
    generateExternalId(connectorId, sourceId, record, recordIndex) {
        // Try to use record's ID field if available
        const idFields = ['id', '_id', 'uuid', 'key'];
        for (const field of idFields) {
            if (record[field]) {
                return `${connectorId}:${sourceId}:${record[field]}`;
            }
        }
        // Fallback to index-based ID
        return `${connectorId}:${sourceId}:record_${recordIndex}`;
    }
    /**
     * Calculate confidence score
     */
    calculateConfidence(mappings, record) {
        const requiredMappings = mappings.filter((m) => m.required);
        if (requiredMappings.length === 0) {
            return 1.0;
        }
        const satisfiedRequirements = requiredMappings.filter((m) => {
            const value = record[m.sourceField];
            return value !== undefined && value !== null && value !== '';
        });
        return satisfiedRequirements.length / requiredMappings.length;
    }
}
exports.CanonicalMapper = CanonicalMapper;
