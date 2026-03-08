"use strict";
// @ts-nocheck
/**
 * P37-38: Mock Data Factory
 * Generates realistic test data for Summit entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockFactory = exports.MockDataFactory = void 0;
exports.createMockFactory = createMockFactory;
const faker_1 = require("@faker-js/faker");
const uuid_1 = require("uuid");
/**
 * Mock Data Factory
 */
class MockDataFactory {
    constructor(options = {}) {
        if (options.seed !== undefined) {
            faker_1.faker.seed(options.seed);
        }
        if (options.locale) {
            faker_1.faker.setLocale(options.locale);
        }
    }
    /**
     * Generate a person entity
     */
    person(overrides = {}) {
        const firstName = overrides.firstName ?? faker_1.faker.person.firstName();
        const lastName = overrides.lastName ?? faker_1.faker.person.lastName();
        return {
            id: overrides.id ?? (0, uuid_1.v4)(),
            type: 'person',
            name: overrides.name ?? `${firstName} ${lastName}`,
            firstName,
            lastName,
            email: overrides.email ?? faker_1.faker.internet.email({ firstName, lastName }),
            phone: overrides.phone ?? faker_1.faker.phone.number(),
            dateOfBirth: overrides.dateOfBirth ?? faker_1.faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
            nationality: overrides.nationality ?? faker_1.faker.location.country(),
            occupation: overrides.occupation ?? faker_1.faker.person.jobTitle(),
            organization: overrides.organization ?? faker_1.faker.company.name(),
            createdAt: overrides.createdAt ?? new Date(),
            updatedAt: overrides.updatedAt ?? new Date(),
            metadata: overrides.metadata ?? {},
        };
    }
    /**
     * Generate an organization entity
     */
    organization(overrides = {}) {
        return {
            id: overrides.id ?? (0, uuid_1.v4)(),
            type: 'organization',
            name: overrides.name ?? faker_1.faker.company.name(),
            industry: overrides.industry ?? faker_1.faker.company.buzzNoun(),
            founded: overrides.founded ?? faker_1.faker.date.past({ years: 50 }),
            headquarters: overrides.headquarters ?? faker_1.faker.location.city(),
            employees: overrides.employees ?? faker_1.faker.number.int({ min: 10, max: 100000 }),
            website: overrides.website ?? faker_1.faker.internet.url(),
            description: overrides.description ?? faker_1.faker.company.catchPhrase(),
            createdAt: overrides.createdAt ?? new Date(),
            updatedAt: overrides.updatedAt ?? new Date(),
            metadata: overrides.metadata ?? {},
        };
    }
    /**
     * Generate a location entity
     */
    location(overrides = {}) {
        return {
            id: overrides.id ?? (0, uuid_1.v4)(),
            type: 'location',
            name: overrides.name ?? faker_1.faker.location.streetAddress(),
            address: overrides.address ?? faker_1.faker.location.streetAddress(),
            city: overrides.city ?? faker_1.faker.location.city(),
            country: overrides.country ?? faker_1.faker.location.country(),
            postalCode: overrides.postalCode ?? faker_1.faker.location.zipCode(),
            latitude: overrides.latitude ?? faker_1.faker.location.latitude(),
            longitude: overrides.longitude ?? faker_1.faker.location.longitude(),
            locationType: overrides.locationType ?? faker_1.faker.helpers.arrayElement(['residential', 'commercial', 'government', 'other']),
            createdAt: overrides.createdAt ?? new Date(),
            updatedAt: overrides.updatedAt ?? new Date(),
            metadata: overrides.metadata ?? {},
        };
    }
    /**
     * Generate a relationship
     */
    relationship(sourceId, targetId, overrides = {}) {
        return {
            id: overrides.id ?? (0, uuid_1.v4)(),
            type: overrides.type ?? faker_1.faker.helpers.arrayElement([
                'knows', 'works_for', 'owns', 'located_at',
                'participated_in', 'authored', 'related_to'
            ]),
            sourceId,
            targetId,
            properties: overrides.properties ?? {},
            createdAt: overrides.createdAt ?? new Date(),
            confidence: overrides.confidence ?? faker_1.faker.number.float({ min: 0.5, max: 1, fractionDigits: 2 }),
        };
    }
    /**
     * Generate an investigation
     */
    investigation(overrides = {}) {
        return {
            id: overrides.id ?? (0, uuid_1.v4)(),
            title: overrides.title ?? faker_1.faker.lorem.sentence(),
            description: overrides.description ?? faker_1.faker.lorem.paragraph(),
            status: overrides.status ?? faker_1.faker.helpers.arrayElement(['open', 'in_progress', 'closed', 'archived']),
            priority: overrides.priority ?? faker_1.faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
            assignedTo: overrides.assignedTo ?? faker_1.faker.person.fullName(),
            createdAt: overrides.createdAt ?? faker_1.faker.date.recent({ days: 30 }),
            updatedAt: overrides.updatedAt ?? new Date(),
            entities: overrides.entities ?? [],
            relationships: overrides.relationships ?? [],
            tags: overrides.tags ?? faker_1.faker.lorem.words(3).split(' '),
        };
    }
    /**
     * Generate a complete network of entities and relationships
     */
    network(options = {}) {
        const { people = 10, organizations = 5, locations = 5, relationshipsPerEntity = 3, } = options;
        const entities = [];
        const relationships = [];
        // Generate entities
        for (let i = 0; i < people; i++) {
            entities.push(this.person());
        }
        for (let i = 0; i < organizations; i++) {
            entities.push(this.organization());
        }
        for (let i = 0; i < locations; i++) {
            entities.push(this.location());
        }
        // Generate relationships
        for (const entity of entities) {
            const numRelationships = faker_1.faker.number.int({ min: 1, max: relationshipsPerEntity });
            for (let i = 0; i < numRelationships; i++) {
                const target = faker_1.faker.helpers.arrayElement(entities.filter(e => e.id !== entity.id));
                relationships.push(this.relationship(entity.id, target.id));
            }
        }
        return { entities, relationships };
    }
    /**
     * Generate batch of entities
     */
    batch(generator, count, overrides) {
        return Array.from({ length: count }, () => generator(overrides));
    }
    /**
     * Generate a realistic investigation with entities
     */
    investigationWithEntities(options = {}) {
        const { entityCount = 10, relationshipCount = 15 } = options;
        const entities = [];
        const relationships = [];
        // Mix of entity types
        const peopleCount = Math.ceil(entityCount * 0.5);
        const orgCount = Math.ceil(entityCount * 0.3);
        const locationCount = entityCount - peopleCount - orgCount;
        for (let i = 0; i < peopleCount; i++) {
            entities.push(this.person());
        }
        for (let i = 0; i < orgCount; i++) {
            entities.push(this.organization());
        }
        for (let i = 0; i < locationCount; i++) {
            entities.push(this.location());
        }
        // Generate relationships
        for (let i = 0; i < relationshipCount && entities.length >= 2; i++) {
            const source = faker_1.faker.helpers.arrayElement(entities);
            const target = faker_1.faker.helpers.arrayElement(entities.filter(e => e.id !== source.id));
            relationships.push(this.relationship(source.id, target.id));
        }
        const investigation = this.investigation({
            entities: entities.map(e => e.id),
            relationships: relationships.map(r => r.id),
        });
        return { investigation, entities, relationships };
    }
}
exports.MockDataFactory = MockDataFactory;
/**
 * Default factory instance
 */
exports.mockFactory = new MockDataFactory();
/**
 * Create factory with options
 */
function createMockFactory(options) {
    return new MockDataFactory(options);
}
