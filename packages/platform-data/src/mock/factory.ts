/**
 * P37-38: Mock Data Factory
 * Generates realistic test data for Summit entities
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

/**
 * Entity types supported by the factory
 */
export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'event'
  | 'document'
  | 'transaction'
  | 'communication'
  | 'asset';

/**
 * Relationship types
 */
export type RelationshipType =
  | 'knows'
  | 'works_for'
  | 'owns'
  | 'located_at'
  | 'participated_in'
  | 'authored'
  | 'sent_to'
  | 'received_from'
  | 'related_to';

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  type: EntityType;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Person entity
 */
export interface PersonEntity extends BaseEntity {
  type: 'person';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  nationality: string;
  occupation: string;
  organization?: string;
}

/**
 * Organization entity
 */
export interface OrganizationEntity extends BaseEntity {
  type: 'organization';
  industry: string;
  founded: Date;
  headquarters: string;
  employees: number;
  website: string;
  description: string;
}

/**
 * Location entity
 */
export interface LocationEntity extends BaseEntity {
  type: 'location';
  address: string;
  city: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  locationType: 'residential' | 'commercial' | 'government' | 'other';
}

/**
 * Relationship interface
 */
export interface Relationship {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  properties: Record<string, unknown>;
  createdAt: Date;
  confidence: number;
}

/**
 * Investigation interface
 */
export interface Investigation {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
  entities: string[];
  relationships: string[];
  tags: string[];
}

/**
 * Factory options
 */
export interface FactoryOptions {
  seed?: number;
  locale?: string;
}

/**
 * Mock Data Factory
 */
export class MockDataFactory {
  constructor(options: FactoryOptions = {}) {
    if (options.seed !== undefined) {
      faker.seed(options.seed);
    }
    if (options.locale) {
      faker.setLocale(options.locale);
    }
  }

  /**
   * Generate a person entity
   */
  person(overrides: Partial<PersonEntity> = {}): PersonEntity {
    const firstName = overrides.firstName ?? faker.person.firstName();
    const lastName = overrides.lastName ?? faker.person.lastName();

    return {
      id: overrides.id ?? uuidv4(),
      type: 'person',
      name: overrides.name ?? `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: overrides.email ?? faker.internet.email({ firstName, lastName }),
      phone: overrides.phone ?? faker.phone.number(),
      dateOfBirth: overrides.dateOfBirth ?? faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
      nationality: overrides.nationality ?? faker.location.country(),
      occupation: overrides.occupation ?? faker.person.jobTitle(),
      organization: overrides.organization ?? faker.company.name(),
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      metadata: overrides.metadata ?? {},
    };
  }

  /**
   * Generate an organization entity
   */
  organization(overrides: Partial<OrganizationEntity> = {}): OrganizationEntity {
    return {
      id: overrides.id ?? uuidv4(),
      type: 'organization',
      name: overrides.name ?? faker.company.name(),
      industry: overrides.industry ?? faker.company.buzzNoun(),
      founded: overrides.founded ?? faker.date.past({ years: 50 }),
      headquarters: overrides.headquarters ?? faker.location.city(),
      employees: overrides.employees ?? faker.number.int({ min: 10, max: 100000 }),
      website: overrides.website ?? faker.internet.url(),
      description: overrides.description ?? faker.company.catchPhrase(),
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      metadata: overrides.metadata ?? {},
    };
  }

  /**
   * Generate a location entity
   */
  location(overrides: Partial<LocationEntity> = {}): LocationEntity {
    return {
      id: overrides.id ?? uuidv4(),
      type: 'location',
      name: overrides.name ?? faker.location.streetAddress(),
      address: overrides.address ?? faker.location.streetAddress(),
      city: overrides.city ?? faker.location.city(),
      country: overrides.country ?? faker.location.country(),
      postalCode: overrides.postalCode ?? faker.location.zipCode(),
      latitude: overrides.latitude ?? faker.location.latitude(),
      longitude: overrides.longitude ?? faker.location.longitude(),
      locationType: overrides.locationType ?? faker.helpers.arrayElement(['residential', 'commercial', 'government', 'other']),
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
      metadata: overrides.metadata ?? {},
    };
  }

  /**
   * Generate a relationship
   */
  relationship(
    sourceId: string,
    targetId: string,
    overrides: Partial<Relationship> = {}
  ): Relationship {
    return {
      id: overrides.id ?? uuidv4(),
      type: overrides.type ?? faker.helpers.arrayElement([
        'knows', 'works_for', 'owns', 'located_at',
        'participated_in', 'authored', 'related_to'
      ] as RelationshipType[]),
      sourceId,
      targetId,
      properties: overrides.properties ?? {},
      createdAt: overrides.createdAt ?? new Date(),
      confidence: overrides.confidence ?? faker.number.float({ min: 0.5, max: 1, fractionDigits: 2 }),
    };
  }

  /**
   * Generate an investigation
   */
  investigation(overrides: Partial<Investigation> = {}): Investigation {
    return {
      id: overrides.id ?? uuidv4(),
      title: overrides.title ?? faker.lorem.sentence(),
      description: overrides.description ?? faker.lorem.paragraph(),
      status: overrides.status ?? faker.helpers.arrayElement(['open', 'in_progress', 'closed', 'archived']),
      priority: overrides.priority ?? faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      assignedTo: overrides.assignedTo ?? faker.person.fullName(),
      createdAt: overrides.createdAt ?? faker.date.recent({ days: 30 }),
      updatedAt: overrides.updatedAt ?? new Date(),
      entities: overrides.entities ?? [],
      relationships: overrides.relationships ?? [],
      tags: overrides.tags ?? faker.lorem.words(3).split(' '),
    };
  }

  /**
   * Generate a complete network of entities and relationships
   */
  network(options: {
    people?: number;
    organizations?: number;
    locations?: number;
    relationshipsPerEntity?: number;
  } = {}): {
    entities: BaseEntity[];
    relationships: Relationship[];
  } {
    const {
      people = 10,
      organizations = 5,
      locations = 5,
      relationshipsPerEntity = 3,
    } = options;

    const entities: BaseEntity[] = [];
    const relationships: Relationship[] = [];

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
      const numRelationships = faker.number.int({ min: 1, max: relationshipsPerEntity });

      for (let i = 0; i < numRelationships; i++) {
        const target = faker.helpers.arrayElement(entities.filter(e => e.id !== entity.id));
        relationships.push(this.relationship(entity.id, target.id));
      }
    }

    return { entities, relationships };
  }

  /**
   * Generate batch of entities
   */
  batch<T extends BaseEntity>(
    generator: (overrides?: Partial<T>) => T,
    count: number,
    overrides?: Partial<T>
  ): T[] {
    return Array.from({ length: count }, () => generator(overrides));
  }

  /**
   * Generate a realistic investigation with entities
   */
  investigationWithEntities(options: {
    entityCount?: number;
    relationshipCount?: number;
  } = {}): {
    investigation: Investigation;
    entities: BaseEntity[];
    relationships: Relationship[];
  } {
    const { entityCount = 10, relationshipCount = 15 } = options;

    const entities: BaseEntity[] = [];
    const relationships: Relationship[] = [];

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
      const source = faker.helpers.arrayElement(entities);
      const target = faker.helpers.arrayElement(entities.filter(e => e.id !== source.id));
      relationships.push(this.relationship(source.id, target.id));
    }

    const investigation = this.investigation({
      entities: entities.map(e => e.id),
      relationships: relationships.map(r => r.id),
    });

    return { investigation, entities, relationships };
  }
}

/**
 * Default factory instance
 */
export const mockFactory = new MockDataFactory();

/**
 * Create factory with options
 */
export function createMockFactory(options?: FactoryOptions): MockDataFactory {
  return new MockDataFactory(options);
}
