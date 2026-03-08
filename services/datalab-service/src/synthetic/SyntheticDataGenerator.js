"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntheticDataGenerator = void 0;
exports.getSyntheticDataGenerator = getSyntheticDataGenerator;
const uuid_1 = require("uuid");
const index_js_1 = require("../types/index.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('SyntheticDataGenerator');
/**
 * SyntheticDataGenerator creates realistic synthetic data
 * for sandbox environments without using real PII.
 */
class SyntheticDataGenerator {
    customGenerators = new Map();
    constructor() {
        this.registerDefaultGenerators();
    }
    /**
     * Generate synthetic data based on request
     */
    async generate(request) {
        const resultId = (0, uuid_1.v4)();
        const startTime = Date.now();
        logger.info('Starting synthetic data generation', {
            sandboxId: request.sandboxId,
            schemas: request.schemas.length,
            totalEntities: request.config.totalEntities,
        });
        try {
            // Initialize context with seeded random
            const context = this.createContext(request.config.seed);
            // Calculate entity distribution
            const distribution = this.calculateDistribution(request.schemas, request.config.totalEntities, request.config.entityDistribution);
            // Generate entities
            for (const schema of request.schemas) {
                const count = distribution.get(schema.entityType) || 0;
                const entities = this.generateEntities(schema, count, context);
                context.entitiesByType.set(schema.entityType, entities);
            }
            // Generate relationships
            if (request.config.generateRelationships) {
                this.generateRelationships(request.schemas, context, request.config.connectivityDensity);
            }
            // Collect statistics
            const totalEntities = Array.from(context.entitiesByType.values()).reduce((sum, entities) => sum + entities.length, 0);
            const byEntityType = {};
            for (const [type, entities] of context.entitiesByType) {
                byEntityType[type] = entities.length;
            }
            const result = {
                id: resultId,
                sandboxId: request.sandboxId,
                status: 'completed',
                statistics: {
                    entitiesGenerated: totalEntities,
                    relationshipsGenerated: context.relationships.length,
                    byEntityType,
                    generationTimeMs: Date.now() - startTime,
                },
                sampleData: this.getSampleData(context),
                startedAt: new Date(startTime),
                completedAt: new Date(),
            };
            logger.info('Synthetic data generation complete', {
                resultId,
                entities: totalEntities,
                relationships: context.relationships.length,
                timeMs: result.statistics.generationTimeMs,
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Synthetic data generation failed', {
                sandboxId: request.sandboxId,
                error: errorMessage,
            });
            return {
                id: resultId,
                sandboxId: request.sandboxId,
                status: 'failed',
                statistics: {
                    entitiesGenerated: 0,
                    relationshipsGenerated: 0,
                    byEntityType: {},
                    generationTimeMs: Date.now() - startTime,
                },
                startedAt: new Date(startTime),
                completedAt: new Date(),
                error: errorMessage,
            };
        }
    }
    /**
     * Get generated data for storage
     */
    getGeneratedData(context) {
        const entities = [];
        for (const typeEntities of context.entitiesByType.values()) {
            entities.push(...typeEntities);
        }
        return {
            entities,
            relationships: context.relationships,
        };
    }
    /**
     * Register a custom generator function
     */
    registerGenerator(name, generator) {
        this.customGenerators.set(name, generator);
        logger.info('Registered custom generator', { name });
    }
    // Private methods
    createContext(seed) {
        const actualSeed = seed ?? Date.now();
        // Simple seeded random (mulberry32)
        let state = actualSeed;
        const random = () => {
            state |= 0;
            state = (state + 0x6d2b79f5) | 0;
            let t = Math.imul(state ^ (state >>> 15), 1 | state);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        return {
            seed: actualSeed,
            entitiesByType: new Map(),
            relationships: [],
            random,
        };
    }
    calculateDistribution(schemas, totalEntities, customDistribution) {
        const distribution = new Map();
        if (customDistribution) {
            // Use custom distribution (percentages)
            const total = Object.values(customDistribution).reduce((a, b) => a + b, 0);
            for (const schema of schemas) {
                const percentage = customDistribution[schema.entityType] || 0;
                distribution.set(schema.entityType, Math.round((percentage / total) * totalEntities));
            }
        }
        else {
            // Equal distribution
            const countPerType = Math.floor(totalEntities / schemas.length);
            for (const schema of schemas) {
                distribution.set(schema.entityType, countPerType);
            }
        }
        return distribution;
    }
    generateEntities(schema, count, context) {
        const entities = [];
        for (let i = 0; i < count; i++) {
            const properties = {};
            for (const field of schema.fields) {
                const value = this.generateFieldValue(field, context);
                if (value !== null || !field.nullable) {
                    properties[field.name] = value;
                }
            }
            entities.push({
                id: (0, uuid_1.v4)(),
                entityType: schema.entityType,
                properties,
                createdAt: new Date(),
                dataSource: 'synthetic',
            });
        }
        return entities;
    }
    generateFieldValue(field, context) {
        // Handle nullable
        if (field.nullable && context.random() < (field.nullProbability || 0)) {
            return null;
        }
        // Check for builtin generator
        if (field.generator in index_js_1.BUILTIN_GENERATORS) {
            return this.runBuiltinGenerator(field.generator, field.config, context);
        }
        // Check for custom generator
        if (this.customGenerators.has(field.generator)) {
            return this.customGenerators.get(field.generator)(field.config);
        }
        // Fallback to type-based generation
        return this.generateByType(field.type, field.config, context);
    }
    runBuiltinGenerator(name, config, context) {
        const generatorInfo = index_js_1.BUILTIN_GENERATORS[name];
        // Since faker-js may not be available, use simple generators
        switch (name) {
            case 'person.firstName':
                return this.randomFromList(FIRST_NAMES, context);
            case 'person.lastName':
                return this.randomFromList(LAST_NAMES, context);
            case 'person.fullName':
                return `${this.randomFromList(FIRST_NAMES, context)} ${this.randomFromList(LAST_NAMES, context)}`;
            case 'person.gender':
                return context.random() > 0.5 ? 'male' : 'female';
            case 'person.jobTitle':
                return this.randomFromList(JOB_TITLES, context);
            case 'internet.email':
                return `${this.randomString(8, context)}@example.com`;
            case 'phone.number':
                return `555-${this.randomDigits(3, context)}-${this.randomDigits(4, context)}`;
            case 'location.city':
                return this.randomFromList(CITIES, context);
            case 'location.country':
                return this.randomFromList(COUNTRIES, context);
            case 'location.address':
                return `${this.randomInt(1, 9999, context)} ${this.randomFromList(STREET_NAMES, context)} ${this.randomFromList(['St', 'Ave', 'Blvd', 'Rd', 'Ln'], context)}`;
            case 'location.coordinates':
                return [
                    (context.random() * 180 - 90).toFixed(6),
                    (context.random() * 360 - 180).toFixed(6),
                ];
            case 'company.name':
                return `${this.randomFromList(COMPANY_PREFIXES, context)} ${this.randomFromList(COMPANY_SUFFIXES, context)}`;
            case 'company.industry':
                return this.randomFromList(INDUSTRIES, context);
            case 'finance.amount':
                return (context.random() * 10000).toFixed(2);
            case 'finance.currency':
                return this.randomFromList(['USD', 'EUR', 'GBP', 'JPY', 'CAD'], context);
            case 'finance.accountNumber':
                return this.randomDigits(10, context);
            case 'date.past':
                return new Date(Date.now() - context.random() * 365 * 24 * 60 * 60 * 1000);
            case 'date.future':
                return new Date(Date.now() + context.random() * 365 * 24 * 60 * 60 * 1000);
            case 'date.recent':
                return new Date(Date.now() - context.random() * 30 * 24 * 60 * 60 * 1000);
            case 'string.uuid':
                return (0, uuid_1.v4)();
            case 'string.alphanumeric':
                return this.randomString(Number(config.length) || 10, context);
            case 'lorem.sentence':
                return this.generateSentence(context);
            case 'lorem.paragraph':
                return Array.from({ length: 5 }, () => this.generateSentence(context)).join(' ');
            case 'number.int':
                return this.randomInt(Number(config.min) || 0, Number(config.max) || 1000, context);
            case 'number.float':
                return context.random() * (Number(config.max) || 1000);
            case 'datatype.boolean':
                return context.random() > 0.5;
            default:
                return this.randomString(10, context);
        }
    }
    generateByType(type, config, context) {
        switch (type) {
            case 'string':
                return this.randomString(Number(config.length) || 10, context);
            case 'number':
                return this.randomInt(Number(config.min) || 0, Number(config.max) || 1000, context);
            case 'boolean':
                return context.random() > 0.5;
            case 'date':
                return new Date(Date.now() - context.random() * 365 * 24 * 60 * 60 * 1000);
            case 'uuid':
                return (0, uuid_1.v4)();
            case 'array':
                const length = Number(config.length) || 3;
                return Array.from({ length }, () => this.generateByType(String(config.itemType) || 'string', {}, context));
            case 'object':
                return {};
            default:
                return null;
        }
    }
    generateRelationships(schemas, context, density) {
        for (const schema of schemas) {
            const sourceEntities = context.entitiesByType.get(schema.entityType) || [];
            for (const relTemplate of schema.relationshipTypes || []) {
                const targetEntities = context.entitiesByType.get(relTemplate.targetEntityType) || [];
                if (targetEntities.length === 0)
                    continue;
                for (const source of sourceEntities) {
                    // Determine if this entity should have this relationship
                    if (context.random() > relTemplate.probability * density)
                        continue;
                    // Determine relationship count
                    const count = relTemplate.minCount +
                        Math.floor(context.random() * (relTemplate.maxCount - relTemplate.minCount + 1));
                    for (let i = 0; i < count && i < targetEntities.length; i++) {
                        const targetIndex = Math.floor(context.random() * targetEntities.length);
                        const target = targetEntities[targetIndex];
                        // Avoid self-relationships
                        if (source.id === target.id)
                            continue;
                        context.relationships.push({
                            id: (0, uuid_1.v4)(),
                            type: relTemplate.type,
                            sourceId: source.id,
                            targetId: target.id,
                            properties: {},
                            dataSource: 'synthetic',
                        });
                    }
                }
            }
        }
    }
    getSampleData(context) {
        const samples = [];
        for (const [type, entities] of context.entitiesByType) {
            for (let i = 0; i < Math.min(3, entities.length); i++) {
                samples.push({
                    _type: type,
                    ...entities[i].properties,
                });
            }
        }
        return samples.slice(0, 10);
    }
    // Random helpers
    randomFromList(list, context) {
        return list[Math.floor(context.random() * list.length)];
    }
    randomString(length, context) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length }, () => chars[Math.floor(context.random() * chars.length)]).join('');
    }
    randomDigits(length, context) {
        return Array.from({ length }, () => Math.floor(context.random() * 10).toString()).join('');
    }
    randomInt(min, max, context) {
        return Math.floor(context.random() * (max - min + 1)) + min;
    }
    generateSentence(context) {
        const templates = [
            'The {adj} {noun} {verb} the {noun}.',
            'A {adj} {noun} {verb} {adv}.',
            '{noun}s {verb} with {adj} {noun}s.',
            'The {noun} was {adj} and {adj}.',
        ];
        const template = this.randomFromList(templates, context);
        return template
            .replace('{adj}', this.randomFromList(ADJECTIVES, context))
            .replace('{adj}', this.randomFromList(ADJECTIVES, context))
            .replace('{noun}', this.randomFromList(NOUNS, context))
            .replace('{noun}', this.randomFromList(NOUNS, context))
            .replace('{noun}', this.randomFromList(NOUNS, context))
            .replace('{verb}', this.randomFromList(VERBS, context))
            .replace('{adv}', this.randomFromList(ADVERBS, context));
    }
    registerDefaultGenerators() {
        // Register any additional custom generators here
    }
}
exports.SyntheticDataGenerator = SyntheticDataGenerator;
// Word lists for generation
const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const JOB_TITLES = ['Software Engineer', 'Data Analyst', 'Product Manager', 'Sales Representative', 'Marketing Manager', 'Operations Director', 'Financial Analyst', 'HR Manager', 'Project Manager', 'Business Analyst'];
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Japan', 'Australia', 'Brazil', 'India', 'China'];
const STREET_NAMES = ['Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Pine', 'Washington', 'Lake', 'Hill', 'Park'];
const COMPANY_PREFIXES = ['Global', 'United', 'National', 'International', 'American', 'Pacific', 'Atlantic', 'Northern', 'Southern', 'Central'];
const COMPANY_SUFFIXES = ['Industries', 'Technologies', 'Solutions', 'Services', 'Systems', 'Corp', 'Inc', 'Group', 'Partners', 'Associates'];
const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Energy', 'Transportation', 'Real Estate', 'Education', 'Entertainment'];
const ADJECTIVES = ['quick', 'lazy', 'sleepy', 'noisy', 'hungry', 'bright', 'dark', 'cold', 'warm', 'soft'];
const NOUNS = ['fox', 'dog', 'cat', 'mouse', 'bird', 'tree', 'house', 'car', 'book', 'phone'];
const VERBS = ['jumps', 'runs', 'walks', 'flies', 'swims', 'eats', 'sleeps', 'reads', 'writes', 'speaks'];
const ADVERBS = ['quickly', 'slowly', 'quietly', 'loudly', 'carefully', 'happily', 'sadly', 'eagerly', 'calmly', 'gracefully'];
/**
 * Singleton instance
 */
let generatorInstance = null;
function getSyntheticDataGenerator() {
    if (!generatorInstance) {
        generatorInstance = new SyntheticDataGenerator();
    }
    return generatorInstance;
}
