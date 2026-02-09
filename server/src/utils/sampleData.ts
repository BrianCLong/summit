import { getNeo4jDriver } from '../db/neo4j.js';
import { getPostgresPool } from '../db/postgres.js';
import { randomUUID as uuidv4 } from 'crypto';
import { logger } from './logger.js';
import type { Integer } from 'neo4j-driver';

/**
 * Creates sample data in Neo4j and PostgreSQL for development purposes.
 *
 * This function populates the databases with:
 * - Entities (Person, Organization, Event, Location, Asset) in Neo4j.
 * - Relationships (WORKS_FOR, INVOLVED_IN) between entities in Neo4j.
 * - Users (Admin, Analyst) in PostgreSQL.
 * - Investigations in PostgreSQL.
 *
 * It is idempotent-ish (uses MERGE/ON CONFLICT) but intended for clean or dev environments.
 *
 * @returns A Promise that resolves when the data creation is complete.
 */
export async function createSampleData(): Promise<void> {
  logger.info('Creating sample data for development...');

  try {
    await createSampleEntities();
    await createSampleRelationships();
    await createSampleUsers();
    await createSampleInvestigations();
    logger.info('Sample data created successfully');
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to create sample data');
  }
}

interface EntityData {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

async function createSampleEntities(): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const entities: EntityData[] = [
      {
        id: uuidv4(),
        type: 'PERSON',
        props: {
          name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '+1-555-0101',
          location: 'New York, NY',
        },
      },
      {
        id: uuidv4(),
        type: 'ORGANIZATION',
        props: {
          name: 'Tech Corp Industries',
          industry: 'Technology',
          headquarters: 'San Francisco, CA',
          website: 'https://techcorp.example.com',
        },
      },
      {
        id: uuidv4(),
        type: 'EVENT',
        props: {
          name: 'Data Breach Incident',
          date: '2024-08-01',
          severity: 'HIGH',
          status: 'INVESTIGATING',
        },
      },
      {
        id: uuidv4(),
        type: 'LOCATION',
        props: {
          name: 'Corporate Headquarters',
          address: '100 Market Street, San Francisco, CA 94105',
          coordinates: { lat: 37.7749, lng: -122.4194 },
        },
      },
      {
        id: uuidv4(),
        type: 'ASSET',
        props: {
          name: 'Database Server DB-01',
          type: 'SERVER',
          ip_address: '192.168.1.100',
          status: 'ACTIVE',
        },
      },
    ];

    for (const entity of entities) {
      await session.run(
        `
        MERGE (e:Entity:${entity.type} {id: $id})
        SET e.type = $type,
            e.props = $props,
            e.createdAt = datetime(),
            e.updatedAt = datetime()
      `,
        {
          id: entity.id,
          type: entity.type,
          props: entity.props,
        },
      );
    }

    logger.info(`Created ${entities.length} sample entities`);
  } finally {
    await session.close();
  }
}

interface RelationshipData {
  id: string;
  from: string;
  to: string;
  type: string;
  props: Record<string, unknown>;
}

async function createSampleRelationships(): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Get some entities to create relationships between
    const entitiesResult = await session.run(
      'MATCH (e:Entity) RETURN e LIMIT 5',
    );
    const entities = entitiesResult.records.map((r: { get: (key: string) => unknown }) => r.get('e'));

    if (entities.length >= 2) {
      const relationships: RelationshipData[] = [
        {
          id: uuidv4(),
          from: String(entities[0].properties.id),
          to: String(entities[1].properties.id),
          type: 'WORKS_FOR',
          props: {
            position: 'Senior Developer',
            start_date: '2023-01-15',
          },
        },
        {
          id: uuidv4(),
          from: String(entities[1].properties.id),
          to: String(entities[2].properties.id),
          type: 'INVOLVED_IN',
          props: {
            role: 'Primary Suspect',
            confidence: 0.85,
          },
        },
      ];

      for (const rel of relationships) {
        await session.run(
          `
          MATCH (from:Entity {id: $from}), (to:Entity {id: $to})
          MERGE (from)-[r:${rel.type} {id: $id}]->(to)
          SET r.props = $props,
              r.createdAt = datetime()
        `,
          {
            id: rel.id,
            from: rel.from,
            to: rel.to,
            props: rel.props,
          },
        );
      }

      logger.info(`Created ${relationships.length} sample relationships`);
    }
  } finally {
    await session.close();
  }
}

interface UserData {
  id: string;
  email: string;
  username: string;
  role: string;
}

async function createSampleUsers(): Promise<void> {
  const pool = getPostgresPool();

  try {
    const users: UserData[] = [
      {
        id: uuidv4(),
        email: 'admin@intelgraph.com',
        username: 'admin',
        role: 'ADMIN',
      },
      {
        id: uuidv4(),
        email: 'analyst@intelgraph.com',
        username: 'analyst',
        role: 'ANALYST',
      },
    ];

    for (const user of users) {
      await pool.query(
        `
        INSERT INTO users (id, email, username, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `,
        [user.id, user.email, user.username, user.role],
      );
    }

    logger.info(`Created ${users.length} sample users`);
  } catch (error: unknown) {
    logger.debug('Users table may not exist yet, skipping user creation');
  }
}

interface InvestigationData {
  id: string;
  name: string;
  description: string;
  status: string;
}

async function createSampleInvestigations(): Promise<void> {
  const pool = getPostgresPool();

  try {
    const investigations: InvestigationData[] = [
      {
        id: uuidv4(),
        name: 'Corporate Espionage Investigation',
        description:
          'Investigating potential data theft and corporate espionage activities',
        status: 'ACTIVE',
      },
      {
        id: uuidv4(),
        name: 'Cybersecurity Incident Response',
        description: 'Response to recent data breach and security incident',
        status: 'IN_PROGRESS',
      },
    ];

    for (const investigation of investigations) {
      await pool.query(
        `
        INSERT INTO investigations (id, name, description, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `,
        [
          investigation.id,
          investigation.name,
          investigation.description,
          investigation.status,
        ],
      );
    }

    logger.info(`Created ${investigations.length} sample investigations`);
  } catch (error: unknown) {
    logger.debug(
      'Investigations table may not exist yet, skipping investigation creation',
    );
  }
}
