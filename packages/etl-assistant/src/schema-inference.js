"use strict";
/**
 * Schema Inference Module
 *
 * Analyzes sample records to infer entity type and field mappings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaInference = void 0;
/**
 * Schema Inference Engine
 */
class SchemaInference {
    /**
     * Infer schema from sample records
     */
    inferSchema(samples, schemaHint) {
        if (samples.length === 0) {
            throw new Error('No sample records provided');
        }
        // Calculate field statistics
        const statistics = this.calculateStatistics(samples);
        // Infer entity type
        const entityType = this.inferEntityType(samples, statistics, schemaHint);
        // Generate field mappings
        const fieldMappings = this.generateFieldMappings(samples, statistics, entityType);
        // Calculate confidence
        const confidence = this.calculateConfidence(fieldMappings, statistics);
        return {
            entityType,
            confidence,
            fieldMappings,
            statistics,
            reasoning: this.generateReasoning(entityType, fieldMappings, statistics),
        };
    }
    /**
     * Calculate statistics for all fields
     */
    calculateStatistics(samples) {
        const allFields = new Set();
        samples.forEach((sample) => {
            Object.keys(sample).forEach((key) => allFields.add(key));
        });
        const fields = Array.from(allFields).map((field) => {
            return this.calculateFieldStatistics(field, samples);
        });
        return {
            recordCount: samples.length,
            fieldCount: fields.length,
            fields,
        };
    }
    /**
     * Calculate statistics for a single field
     */
    calculateFieldStatistics(field, samples) {
        const values = samples.map((s) => s[field]).filter((v) => v !== null && v !== undefined);
        const uniqueValues = new Set(values);
        const stats = {
            field,
            type: this.inferFieldType(values),
            nullCount: samples.length - values.length,
            uniqueCount: uniqueValues.size,
            sampleValues: Array.from(uniqueValues).slice(0, 5),
        };
        // String statistics
        if (stats.type === 'string' || stats.type === 'email' || stats.type === 'url') {
            const lengths = values
                .filter((v) => typeof v === 'string')
                .map((v) => v.length);
            if (lengths.length > 0) {
                stats.minLength = Math.min(...lengths);
                stats.maxLength = Math.max(...lengths);
                stats.avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
            }
        }
        // Number statistics
        if (stats.type === 'number') {
            const numbers = values.filter((v) => typeof v === 'number');
            if (numbers.length > 0) {
                stats.min = Math.min(...numbers);
                stats.max = Math.max(...numbers);
                stats.avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
            }
        }
        return stats;
    }
    /**
     * Infer field type from sample values
     */
    inferFieldType(values) {
        if (values.length === 0)
            return 'unknown';
        const firstValue = values[0];
        // Check for email
        if (typeof firstValue === 'string' && this.isEmail(firstValue)) {
            return 'email';
        }
        // Check for phone
        if (typeof firstValue === 'string' && this.isPhone(firstValue)) {
            return 'phone';
        }
        // Check for URL
        if (typeof firstValue === 'string' && this.isURL(firstValue)) {
            return 'url';
        }
        // Check for date/datetime
        if (typeof firstValue === 'string' && this.isDate(firstValue)) {
            return this.isDateTime(firstValue) ? 'datetime' : 'date';
        }
        // Check for array
        if (Array.isArray(firstValue)) {
            return 'array';
        }
        // Check for object
        if (typeof firstValue === 'object' && firstValue !== null) {
            return 'object';
        }
        // Check for boolean
        if (typeof firstValue === 'boolean') {
            return 'boolean';
        }
        // Check for number
        if (typeof firstValue === 'number') {
            return 'number';
        }
        // Check for string
        if (typeof firstValue === 'string') {
            return 'string';
        }
        return 'unknown';
    }
    /**
     * Infer canonical entity type
     */
    inferEntityType(samples, statistics, schemaHint) {
        // If hint provided, use it
        if (schemaHint) {
            const normalized = this.normalizeEntityType(schemaHint);
            if (this.isValidEntityType(normalized)) {
                return normalized;
            }
        }
        // Analyze field names to infer type
        const fieldNames = statistics.fields.map((f) => f.field.toLowerCase());
        // Person indicators
        const personIndicators = ['name', 'firstname', 'lastname', 'email', 'phone', 'age', 'dob', 'ssn'];
        const personScore = personIndicators.filter((indicator) => fieldNames.some((field) => field.includes(indicator))).length;
        // Organization indicators
        const orgIndicators = ['company', 'organization', 'org', 'business', 'corporation', 'industry'];
        const orgScore = orgIndicators.filter((indicator) => fieldNames.some((field) => field.includes(indicator))).length;
        // Location indicators
        const locationIndicators = ['address', 'city', 'state', 'country', 'zip', 'postal', 'latitude', 'longitude', 'coordinates'];
        const locationScore = locationIndicators.filter((indicator) => fieldNames.some((field) => field.includes(indicator))).length;
        // Event indicators
        const eventIndicators = ['event', 'date', 'time', 'timestamp', 'occurred', 'happened'];
        const eventScore = eventIndicators.filter((indicator) => fieldNames.some((field) => field.includes(indicator))).length;
        // Document indicators
        const documentIndicators = ['content', 'body', 'text', 'document', 'file', 'title', 'author'];
        const documentScore = documentIndicators.filter((indicator) => fieldNames.some((field) => field.includes(indicator))).length;
        // Indicator indicators
        const indicatorIndicators = ['indicator', 'ioc', 'ip', 'domain', 'hash', 'md5', 'sha256', 'malware'];
        const indicatorScore = indicatorIndicators.filter((indicator) => fieldNames.some((field) => field.includes(indicator))).length;
        // Find highest score
        const scores = [
            { type: 'Person', score: personScore },
            { type: 'Organization', score: orgScore },
            { type: 'Location', score: locationScore },
            { type: 'Event', score: eventScore },
            { type: 'Document', score: documentScore },
            { type: 'Indicator', score: indicatorScore },
        ];
        scores.sort((a, b) => b.score - a.score);
        // Default to Document if no clear winner
        return scores[0].score > 0 ? scores[0].type : 'Document';
    }
    /**
     * Generate field mappings
     */
    generateFieldMappings(samples, statistics, entityType) {
        const canonicalFields = this.getCanonicalFields(entityType);
        const mappings = [];
        for (const field of statistics.fields) {
            const bestMatch = this.findBestMatch(field.field, field.type, canonicalFields);
            if (bestMatch) {
                mappings.push({
                    sourceField: field.field,
                    targetField: bestMatch.field,
                    sourceType: field.type,
                    targetType: bestMatch.type,
                    confidence: bestMatch.confidence,
                    transformation: bestMatch.transformation,
                    required: bestMatch.required,
                });
            }
            else {
                // No match found - include as custom property
                mappings.push({
                    sourceField: field.field,
                    targetField: `props.${field.field}`,
                    sourceType: field.type,
                    targetType: field.type,
                    confidence: 1.0,
                    required: false,
                });
            }
        }
        return mappings;
    }
    /**
     * Get canonical fields for entity type
     */
    getCanonicalFields(entityType) {
        const fieldMaps = {
            Person: [
                { field: 'name', type: 'string', required: true, aliases: ['fullname', 'full_name', 'person_name', 'firstname', 'lastname'] },
                { field: 'email', type: 'email', required: false, aliases: ['mail', 'e_mail', 'email_address'] },
                { field: 'phone', type: 'phone', required: false, aliases: ['telephone', 'mobile', 'tel', 'phone_number'] },
                { field: 'dateOfBirth', type: 'date', required: false, aliases: ['dob', 'birth_date', 'birthdate'] },
                { field: 'address', type: 'string', required: false, aliases: ['street', 'location'] },
            ],
            Organization: [
                { field: 'name', type: 'string', required: true, aliases: ['company', 'organization', 'org_name', 'business_name'] },
                { field: 'industry', type: 'string', required: false, aliases: ['sector', 'business_type'] },
                { field: 'website', type: 'url', required: false, aliases: ['url', 'homepage', 'web_site'] },
                { field: 'address', type: 'string', required: false, aliases: ['location', 'headquarters'] },
            ],
            Location: [
                { field: 'name', type: 'string', required: true, aliases: ['place', 'location_name'] },
                { field: 'address', type: 'string', required: false, aliases: ['street', 'full_address'] },
                { field: 'city', type: 'string', required: false, aliases: [] },
                { field: 'state', type: 'string', required: false, aliases: ['province', 'region'] },
                { field: 'country', type: 'string', required: false, aliases: [] },
                { field: 'coordinates', type: 'string', required: false, aliases: ['latlng', 'lat_long', 'geo'] },
            ],
            Event: [
                { field: 'name', type: 'string', required: true, aliases: ['event_name', 'title'] },
                { field: 'timestamp', type: 'datetime', required: true, aliases: ['date', 'occurred_at', 'event_time'] },
                { field: 'location', type: 'string', required: false, aliases: ['place', 'venue'] },
                { field: 'description', type: 'string', required: false, aliases: ['details', 'notes'] },
            ],
            Document: [
                { field: 'title', type: 'string', required: true, aliases: ['name', 'document_title', 'filename'] },
                { field: 'content', type: 'string', required: false, aliases: ['body', 'text', 'document_content'] },
                { field: 'author', type: 'string', required: false, aliases: ['creator', 'author_name'] },
                { field: 'createdAt', type: 'datetime', required: false, aliases: ['created', 'date_created', 'timestamp'] },
            ],
            Indicator: [
                { field: 'value', type: 'string', required: true, aliases: ['indicator', 'ioc', 'observable'] },
                { field: 'type', type: 'string', required: true, aliases: ['indicator_type', 'ioc_type'] },
                { field: 'confidence', type: 'number', required: false, aliases: ['score', 'confidence_score'] },
            ],
        };
        return fieldMaps[entityType] || [];
    }
    /**
     * Find best match for a field
     */
    findBestMatch(sourceField, sourceType, canonicalFields) {
        const sourceLower = sourceField.toLowerCase();
        for (const canonical of canonicalFields) {
            // Exact match
            if (canonical.field.toLowerCase() === sourceLower) {
                return {
                    field: canonical.field,
                    type: canonical.type,
                    confidence: 1.0,
                    required: canonical.required,
                };
            }
            // Alias match
            if (canonical.aliases.some((alias) => alias.toLowerCase() === sourceLower)) {
                return {
                    field: canonical.field,
                    type: canonical.type,
                    confidence: 0.9,
                    required: canonical.required,
                };
            }
            // Partial match
            if (sourceLower.includes(canonical.field.toLowerCase()) || canonical.field.toLowerCase().includes(sourceLower)) {
                return {
                    field: canonical.field,
                    type: canonical.type,
                    confidence: 0.7,
                    required: canonical.required,
                };
            }
        }
        return null;
    }
    /**
     * Calculate overall confidence
     */
    calculateConfidence(mappings, statistics) {
        if (mappings.length === 0)
            return 0;
        const avgMappingConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;
        // Penalize if too many nulls
        const nullRate = statistics.fields.reduce((sum, f) => sum + f.nullCount, 0) / (statistics.recordCount * statistics.fieldCount);
        const nullPenalty = Math.max(0, 1 - nullRate);
        return Math.min(1.0, avgMappingConfidence * nullPenalty);
    }
    /**
     * Generate reasoning text
     */
    generateReasoning(entityType, mappings, statistics) {
        const highConfidenceMappings = mappings.filter((m) => m.confidence >= 0.8);
        return `Inferred entity type "${entityType}" based on field analysis. Found ${highConfidenceMappings.length}/${mappings.length} high-confidence field mappings from ${statistics.recordCount} sample records.`;
    }
    // Helper methods
    normalizeEntityType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }
    isValidEntityType(type) {
        const valid = ['Person', 'Organization', 'Location', 'Event', 'Document', 'Indicator'];
        return valid.includes(type);
    }
    isEmail(value) {
        return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/.test(value);
    }
    isPhone(value) {
        return /^\+?[\d\s\-()]{10,}$/.test(value);
    }
    isURL(value) {
        try {
            new URL(value);
            return true;
        }
        catch {
            return false;
        }
    }
    isDate(value) {
        const date = new Date(value);
        return !isNaN(date.getTime());
    }
    isDateTime(value) {
        return value.includes('T') || value.includes(':');
    }
}
exports.SchemaInference = SchemaInference;
