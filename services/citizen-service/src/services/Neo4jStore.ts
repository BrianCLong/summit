import neo4j, { Driver, Session, Record as Neo4jRecord } from 'neo4j-driver';
import pino from 'pino';
import type {
  CitizenProfile,
  ServiceRecord,
  DataConsent,
  Eligibility,
  ServiceDomain,
} from '../schemas/citizen.js';

const logger = pino({ name: 'citizen-neo4j-store' });

/**
 * Neo4j-backed store for citizen data with graph relationships
 * Enables complex queries across service domains and citizen relationships
 */
export class Neo4jCitizenStore {
  private driver: Driver | null = null;

  constructor(
    private uri: string = process.env.NEO4J_URI || 'bolt://localhost:7687',
    private user: string = process.env.NEO4J_USER || 'neo4j',
    private password: string = process.env.NEO4J_PASSWORD || 'devpassword'
  ) {}

  async connect(): Promise<void> {
    try {
      this.driver = neo4j.driver(this.uri, neo4j.auth.basic(this.user, this.password));
      await this.driver.verifyConnectivity();
      logger.info('Connected to Neo4j');
      await this.ensureIndexes();
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Neo4j');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  private async ensureIndexes(): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(`
        CREATE INDEX citizen_national_id IF NOT EXISTS
        FOR (c:Citizen) ON (c.nationalId)
      `);
      await session.run(`
        CREATE INDEX service_record_citizen IF NOT EXISTS
        FOR (s:ServiceRecord) ON (s.citizenId)
      `);
      logger.info('Neo4j indexes ensured');
    } finally {
      await session.close();
    }
  }

  private getSession(): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }
    return this.driver.session();
  }

  async ingestCitizen(data: Omit<CitizenProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<CitizenProfile> {
    const session = this.getSession();
    try {
      const now = new Date().toISOString();
      const result = await session.run(
        `
        MERGE (c:Citizen {nationalId: $nationalId})
        ON CREATE SET
          c.id = randomUUID(),
          c.createdAt = $now,
          c.verified = false
        SET
          c.firstName = $firstName,
          c.lastName = $lastName,
          c.middleName = $middleName,
          c.dateOfBirth = $dateOfBirth,
          c.gender = $gender,
          c.nationality = $nationality,
          c.email = $email,
          c.phone = $phone,
          c.source = $source,
          c.updatedAt = $now
        RETURN c
        `,
        {
          nationalId: data.nationalId,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName || null,
          dateOfBirth: data.dateOfBirth || null,
          gender: data.gender || null,
          nationality: data.nationality || null,
          email: data.contact?.email || null,
          phone: data.contact?.phone || null,
          source: data.source,
          now,
        }
      );

      const record = result.records[0];
      return this.mapNeo4jToCitizen(record.get('c').properties);
    } finally {
      await session.close();
    }
  }

  async getCitizen(id: string): Promise<CitizenProfile | undefined> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH (c:Citizen {id: $id}) RETURN c',
        { id }
      );

      if (result.records.length === 0) {
        return undefined;
      }

      return this.mapNeo4jToCitizen(result.records[0].get('c').properties);
    } finally {
      await session.close();
    }
  }

  async findByNationalId(nationalId: string): Promise<CitizenProfile | undefined> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH (c:Citizen {nationalId: $nationalId}) RETURN c',
        { nationalId }
      );

      if (result.records.length === 0) {
        return undefined;
      }

      return this.mapNeo4jToCitizen(result.records[0].get('c').properties);
    } finally {
      await session.close();
    }
  }

  async addServiceRecord(record: Omit<ServiceRecord, 'id'>): Promise<ServiceRecord> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (c:Citizen {id: $citizenId})
        CREATE (s:ServiceRecord {
          id: randomUUID(),
          citizenId: $citizenId,
          domain: $domain,
          serviceType: $serviceType,
          status: $status,
          requestDate: $requestDate
        })
        CREATE (c)-[:REQUESTED]->(s)
        RETURN s
        `,
        {
          citizenId: record.citizenId,
          domain: record.domain,
          serviceType: record.serviceType,
          status: record.status,
          requestDate: record.requestDate,
        }
      );

      const props = result.records[0].get('s').properties;
      return {
        id: props.id,
        citizenId: props.citizenId,
        domain: props.domain as ServiceDomain,
        serviceType: props.serviceType,
        status: props.status,
        requestDate: props.requestDate,
      };
    } finally {
      await session.close();
    }
  }

  async getServiceRecords(citizenId: string, domain?: ServiceDomain): Promise<ServiceRecord[]> {
    const session = this.getSession();
    try {
      const query = domain
        ? 'MATCH (c:Citizen {id: $citizenId})-[:REQUESTED]->(s:ServiceRecord {domain: $domain}) RETURN s'
        : 'MATCH (c:Citizen {id: $citizenId})-[:REQUESTED]->(s:ServiceRecord) RETURN s';

      const result = await session.run(query, { citizenId, domain });

      return result.records.map((r) => {
        const props = r.get('s').properties;
        return {
          id: props.id,
          citizenId: props.citizenId,
          domain: props.domain as ServiceDomain,
          serviceType: props.serviceType,
          status: props.status,
          requestDate: props.requestDate,
        };
      });
    } finally {
      await session.close();
    }
  }

  async healthCheck(): Promise<{ status: 'pass' | 'fail'; latency: number }> {
    if (!this.driver) {
      return { status: 'fail', latency: 0 };
    }

    const start = Date.now();
    const session = this.getSession();
    try {
      await session.run('RETURN 1');
      return { status: 'pass', latency: Date.now() - start };
    } catch {
      return { status: 'fail', latency: Date.now() - start };
    } finally {
      await session.close();
    }
  }

  private mapNeo4jToCitizen(props: Record<string, unknown>): CitizenProfile {
    return {
      id: props.id as string,
      nationalId: props.nationalId as string,
      firstName: props.firstName as string,
      lastName: props.lastName as string,
      middleName: props.middleName as string | undefined,
      dateOfBirth: props.dateOfBirth as string | undefined,
      gender: props.gender as CitizenProfile['gender'],
      nationality: props.nationality as string | undefined,
      contact: {
        email: props.email as string | undefined,
        phone: props.phone as string | undefined,
      },
      verified: props.verified as boolean,
      verificationDate: props.verificationDate as string | undefined,
      source: props.source as string,
      createdAt: props.createdAt as string,
      updatedAt: props.updatedAt as string,
    };
  }
}
