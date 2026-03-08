"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jCitizenStore = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'citizen-neo4j-store' });
/**
 * Neo4j-backed store for citizen data with graph relationships
 * Enables complex queries across service domains and citizen relationships
 */
class Neo4jCitizenStore {
    uri;
    user;
    password;
    driver = null;
    constructor(uri = process.env.NEO4J_URI || 'bolt://localhost:7687', user = process.env.NEO4J_USER || 'neo4j', password = process.env.NEO4J_PASSWORD || 'devpassword') {
        this.uri = uri;
        this.user = user;
        this.password = password;
    }
    async connect() {
        try {
            this.driver = neo4j_driver_1.default.driver(this.uri, neo4j_driver_1.default.auth.basic(this.user, this.password));
            await this.driver.verifyConnectivity();
            logger.info('Connected to Neo4j');
            await this.ensureIndexes();
        }
        catch (error) {
            logger.error({ error }, 'Failed to connect to Neo4j');
            throw error;
        }
    }
    async disconnect() {
        if (this.driver) {
            await this.driver.close();
            this.driver = null;
        }
    }
    async ensureIndexes() {
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
        }
        finally {
            await session.close();
        }
    }
    getSession() {
        if (!this.driver) {
            throw new Error('Neo4j driver not initialized');
        }
        return this.driver.session();
    }
    async ingestCitizen(data) {
        const session = this.getSession();
        try {
            const now = new Date().toISOString();
            const result = await session.run(`
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
        `, {
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
            });
            const record = result.records[0];
            return this.mapNeo4jToCitizen(record.get('c').properties);
        }
        finally {
            await session.close();
        }
    }
    async getCitizen(id) {
        const session = this.getSession();
        try {
            const result = await session.run('MATCH (c:Citizen {id: $id}) RETURN c', { id });
            if (result.records.length === 0) {
                return undefined;
            }
            return this.mapNeo4jToCitizen(result.records[0].get('c').properties);
        }
        finally {
            await session.close();
        }
    }
    async findByNationalId(nationalId) {
        const session = this.getSession();
        try {
            const result = await session.run('MATCH (c:Citizen {nationalId: $nationalId}) RETURN c', { nationalId });
            if (result.records.length === 0) {
                return undefined;
            }
            return this.mapNeo4jToCitizen(result.records[0].get('c').properties);
        }
        finally {
            await session.close();
        }
    }
    async addServiceRecord(record) {
        const session = this.getSession();
        try {
            const result = await session.run(`
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
        `, {
                citizenId: record.citizenId,
                domain: record.domain,
                serviceType: record.serviceType,
                status: record.status,
                requestDate: record.requestDate,
            });
            const props = result.records[0].get('s').properties;
            return {
                id: props.id,
                citizenId: props.citizenId,
                domain: props.domain,
                serviceType: props.serviceType,
                status: props.status,
                requestDate: props.requestDate,
            };
        }
        finally {
            await session.close();
        }
    }
    async getServiceRecords(citizenId, domain) {
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
                    domain: props.domain,
                    serviceType: props.serviceType,
                    status: props.status,
                    requestDate: props.requestDate,
                };
            });
        }
        finally {
            await session.close();
        }
    }
    async healthCheck() {
        if (!this.driver) {
            return { status: 'fail', latency: 0 };
        }
        const start = Date.now();
        const session = this.getSession();
        try {
            await session.run('RETURN 1');
            return { status: 'pass', latency: Date.now() - start };
        }
        catch {
            return { status: 'fail', latency: Date.now() - start };
        }
        finally {
            await session.close();
        }
    }
    mapNeo4jToCitizen(props) {
        return {
            id: props.id,
            nationalId: props.nationalId,
            firstName: props.firstName,
            lastName: props.lastName,
            middleName: props.middleName,
            dateOfBirth: props.dateOfBirth,
            gender: props.gender,
            nationality: props.nationality,
            contact: {
                email: props.email,
                phone: props.phone,
            },
            verified: props.verified,
            verificationDate: props.verificationDate,
            source: props.source,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt,
        };
    }
}
exports.Neo4jCitizenStore = Neo4jCitizenStore;
