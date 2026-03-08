"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaMapper = exports.EntityTypeSchema = void 0;
exports.createWizard = createWizard;
const zod_1 = require("zod");
exports.EntityTypeSchema = zod_1.z.enum(['Person', 'Organization', 'Asset', 'Event', 'Document', 'Location']);
class SchemaMapper {
    piiPatterns = {
        ssn: /^\d{3}-\d{2}-\d{4}$/,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\+?[\d\s\-()]+$/,
        creditCard: /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/,
    };
    suggestMappings(headers, sample) {
        return headers.map(header => {
            const lowerHeader = header.toLowerCase();
            let entityType = 'Person';
            let targetField = header;
            let isPII = false;
            // AI-assisted field mapping (rule-based stub)
            if (lowerHeader.includes('name') || lowerHeader.includes('person')) {
                entityType = 'Person';
                targetField = 'name';
            }
            else if (lowerHeader.includes('org') || lowerHeader.includes('company')) {
                entityType = 'Organization';
                targetField = 'name';
            }
            else if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
                entityType = 'Event';
                targetField = 'timestamp';
            }
            else if (lowerHeader.includes('loc') || lowerHeader.includes('address')) {
                entityType = 'Location';
                targetField = 'address';
            }
            // PII detection
            if (sample.length > 0) {
                const sampleValue = String(sample[0][header] || '');
                isPII = Object.values(this.piiPatterns).some(pattern => pattern.test(sampleValue));
            }
            if (lowerHeader.includes('ssn') || lowerHeader.includes('email') || lowerHeader.includes('phone')) {
                isPII = true;
            }
            return {
                sourceField: header,
                targetField,
                entityType,
                isPII,
            };
        });
    }
    applyRedaction(value, preset) {
        if (!value)
            return value;
        switch (preset) {
            case 'HASH':
                return `[REDACTED:${String(value).substring(0, 4)}***]`;
            case 'MASK':
                return '*'.repeat(String(value).length);
            case 'REMOVE':
                return null;
            default:
                return value;
        }
    }
    ingest(data, config) {
        const lineage = [];
        const entities = data.map((row, idx) => {
            const entity = { _lineage: { row: idx, source: config.datasetName, license: config.license } };
            config.mappings.forEach(mapping => {
                let value = row[mapping.sourceField];
                // Apply redaction if PII and preset defined
                if (mapping.isPII && config.redactionPreset && config.redactionPreset !== 'NONE') {
                    value = this.applyRedaction(value, config.redactionPreset);
                }
                entity[mapping.targetField] = value;
                entity._type = mapping.entityType;
            });
            lineage.push({ rowId: idx, entityId: entity._lineage, license: config.license });
            return entity;
        });
        return entities;
    }
}
exports.SchemaMapper = SchemaMapper;
function createWizard() {
    return new SchemaMapper();
}
