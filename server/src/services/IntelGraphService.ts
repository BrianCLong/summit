// server/src/services/IntelGraphService.ts
import neo4j, { Driver, session as Neo4jSession } from 'neo4j-driver';
import { randomUUID } from 'crypto';
import { getNeo4jDriver } from '../config/database';
import { Entity, Claim, Evidence, PolicyLabel, Decision } from '../graph/schema';
import { AppError, NotFoundError, DatabaseError } from '../lib/errors';
import { provenanceLedger, ProvenanceLedgerV2 } from '../provenance/ledger';
import { Counter, Histogram } from 'prom-client';
import { z } from 'zod/v4';

// --- Zod Validation Schemas for Service Layer ---
const CreateEntitySchema = z.object({ name: z.string().min(1), description: z.string().optional() });
const CreateClaimSchema = z.object({ statement: z.string().min(1), confidence: z.number().min(0).max(1), entityId: z.string().uuid() });
const AttachEvidenceSchema = z.object({ claimId: z.string().uuid(), sourceURI: z.string().url(), hash: z.string().min(1), content: z.string().min(1) });
const TagPolicySchema = z.object({ label: z.string().min(1), sensitivity: z.enum(['public', 'internal', 'confidential', 'secret', 'top-secret']) });
const CreateDecisionSchema = z.object({ question: z.string().min(1), recommendation: z.string().min(1), rationale: z.string().min(1) });

// --- Prometheus Metrics ---
const intelGraphRequestLatency = new Histogram({
  name: 'intelgraph_service_request_latency_seconds',
  help: 'Latency of IntelGraphService methods',
  labelNames: ['method'],
});

const intelGraphOperationsCounter = new Counter({
  name: 'intelgraph_service_operations_total',
  help: 'Total number of operations handled by IntelGraphService',
  labelNames: ['method', 'status'], // status can be 'success' or 'error'
});


/**
 * @class IntelGraphService
 * @description A hardened, production-ready singleton service for all IntelGraph interactions.
 */
export class IntelGraphService {
  private static instance: IntelGraphService;
  private driver: Driver;
  private ledger: ProvenanceLedgerV2;

  private constructor() {
    this.driver = getNeo4jDriver();
    if (!this.driver) {
      throw new AppError('Neo4j driver not initialized', 500);
    }
    this.ledger = provenanceLedger;
  }

  public static getInstance(): IntelGraphService {
    if (!IntelGraphService.instance) {
      IntelGraphService.instance = new IntelGraphService();
    }
    return IntelGraphService.instance;
  }

  /**
   * A higher-order function to wrap method execution with metrics and error handling.
   * @param {string} methodName - The name of the method being executed.
   * @param {Function} fn - The function to execute.
   * @returns {Promise<T>} The result of the function.
   */
  private async measure<T>(methodName: string, fn: (session: Neo4jSession) => Promise<T>): Promise<T> {
    const end = intelGraphRequestLatency.startTimer({ method: methodName });
    const session = this.driver.session();
    try {
      const result = await fn(session);
      intelGraphOperationsCounter.inc({ method: methodName, status: 'success' });
      return result;
    } catch (error) {
      intelGraphOperationsCounter.inc({ method: methodName, status: 'error' });
      if (error instanceof AppError) {
        throw error; // Re-throw known application errors
      }
      // Wrap unknown errors in a standard DatabaseError
      throw new DatabaseError(`IntelGraphService.${methodName} failed: ${error.message}`);
    } finally {
      end();
      await session.close();
    }
  }

  async createEntity(entityData: z.infer<typeof CreateEntitySchema>, owner: string, tenantId: string): Promise<Entity> {
    return this.measure('createEntity', async (session) => {
      const { name, description } = CreateEntitySchema.parse(entityData);
      const now = new Date().toISOString();
      const newEntity: Entity = { id: randomUUID(), createdAt: now, updatedAt: now, owner, name, description: description || '' };

      const result = await session.run('CREATE (e:Entity $props) RETURN e', { props: { ...newEntity, tenantId } });
      const createdEntity = result.records[0]?.get('e').properties as Entity;

      await this.ledger.appendEntry({ tenantId, timestamp: new Date(now), actionType: 'CREATE', resourceType: 'Entity', resourceId: createdEntity.id, actorId: owner, actorType: 'user', payload: { name, description }, metadata: {} });
      return createdEntity;
    });
  }

  async createClaim(claimData: z.infer<typeof CreateClaimSchema>, owner: string, tenantId: string): Promise<Claim> {
    return this.measure('createClaim', async (session) => {
        const { statement, confidence, entityId } = CreateClaimSchema.parse(claimData);
        const now = new Date().toISOString();
        const newClaim: Claim = { id: randomUUID(), createdAt: now, updatedAt: now, owner, statement, confidence, entityId };

        const result = await session.run(
            `MATCH (e:Entity {id: $entityId, tenantId: $tenantId})
             CREATE (c:Claim $props)
             CREATE (c)-[:RELATES_TO]->(e)
             RETURN c`,
            { entityId, tenantId, props: { ...newClaim, tenantId } }
        );

        if (result.records.length === 0) throw new NotFoundError(`Entity with ID ${entityId} not found for this tenant.`);
        const createdClaim = result.records[0].get('c').properties as Claim;

        await this.ledger.appendEntry({ tenantId, timestamp: new Date(now), actionType: 'CREATE', resourceType: 'Claim', resourceId: createdClaim.id, actorId: owner, actorType: 'user', payload: { statement, confidence, entityId }, metadata: {} });
        return createdClaim;
    });
  }

  async attachEvidence(evidenceData: z.infer<typeof AttachEvidenceSchema>, owner: string, tenantId: string): Promise<Evidence> {
      return this.measure('attachEvidence', async (session) => {
          const { claimId, sourceURI, hash, content } = AttachEvidenceSchema.parse(evidenceData);
          const now = new Date().toISOString();
          const newEvidence: Evidence = { id: randomUUID(), createdAt: now, updatedAt: now, owner, sourceURI, hash, content, claimId };

          const result = await session.run(
              `MATCH (c:Claim {id: $claimId, tenantId: $tenantId})
               CREATE (ev:Evidence $props)
               CREATE (ev)-[:SUPPORTS]->(c)
               RETURN ev`,
              { claimId, tenantId, props: { ...newEvidence, tenantId } }
          );

          if (result.records.length === 0) throw new NotFoundError(`Claim with ID ${claimId} not found for this tenant.`);
          const attachedEvidence = result.records[0].get('ev').properties as Evidence;

          await this.ledger.appendEntry({ tenantId, timestamp: new Date(now), actionType: 'ATTACH', resourceType: 'Evidence', resourceId: attachedEvidence.id, actorId: owner, actorType: 'user', payload: { claimId, sourceURI, hash }, metadata: {} });
          return attachedEvidence;
      });
  }

  async tagPolicy(policyData: z.infer<typeof TagPolicySchema>, targetNodeId: string, owner: string, tenantId: string): Promise<PolicyLabel> {
      return this.measure('tagPolicy', async (session) => {
          const { label, sensitivity } = TagPolicySchema.parse(policyData);
          const now = new Date().toISOString();
          const newPolicy: PolicyLabel = { id: randomUUID(), createdAt: now, updatedAt: now, owner, label, sensitivity };

          const result = await session.run(
              `MATCH (n {id: $targetNodeId, tenantId: $tenantId})
               CREATE (p:PolicyLabel $props)
               CREATE (n)-[:HAS_POLICY]->(p)
               RETURN p`,
              { targetNodeId, tenantId, props: { ...newPolicy, tenantId } }
          );

          if (result.records.length === 0) throw new NotFoundError(`Node with ID ${targetNodeId} not found for this tenant.`);
          const taggedPolicy = result.records[0].get('p').properties as PolicyLabel;

          await this.ledger.appendEntry({ tenantId, timestamp: new Date(now), actionType: 'TAG', resourceType: 'PolicyLabel', resourceId: taggedPolicy.id, actorId: owner, actorType: 'user', payload: { targetNodeId, label, sensitivity }, metadata: {} });
          return taggedPolicy;
      });
  }

  async getDecisionProvenance(decisionId: string, tenantId: string): Promise<any> {
      return this.measure('getDecisionProvenance', async (session) => {
          const result = await session.run(
              `MATCH (d:Decision {id: $decisionId, tenantId: $tenantId})
               OPTIONAL MATCH (d)-[:INFORMED_BY]->(c:Claim)
               OPTIONAL MATCH (c)<-[:SUPPORTS]-(ev:Evidence)
               WITH d, c, COLLECT(ev.properties) AS evidences
               WITH d, COLLECT({claim: c.properties, evidences: evidences}) AS claims
               RETURN {decision: d.properties, claims: claims} AS provenance`,
              { decisionId, tenantId }
          );

          if (result.records.length === 0 || !result.records[0].get('provenance').decision) {
              throw new NotFoundError(`Decision with ID ${decisionId} not found for this tenant.`);
          }
          return result.records[0].get('provenance');
      });
  }

  async getEntityClaims(entityId: string, tenantId: string): Promise<any> {
      return this.measure('getEntityClaims', async (session) => {
          const result = await session.run(
              `MATCH (e:Entity {id: $entityId, tenantId: $tenantId})
               OPTIONAL MATCH (e)<-[:RELATES_TO]-(c:Claim)
               OPTIONAL MATCH (c)-[:HAS_POLICY]->(p:PolicyLabel)
               WITH e, c, COLLECT(p.properties) AS policies
               WITH e, COLLECT({claim: c.properties, policies: policies}) AS claims
               RETURN {entity: e.properties, claims: claims} AS entityClaims`,
              { entityId, tenantId }
          );

          if (result.records.length === 0 || !result.records[0].get('entityClaims').entity) {
              throw new NotFoundError(`Entity with ID ${entityId} not found for this tenant.`);
          }
          return result.records[0].get('entityClaims');
      });
  }

  async createDecision(decisionData: z.infer<typeof CreateDecisionSchema>, informedByClaimIds: string[], owner: string, tenantId: string): Promise<Decision> {
      return this.measure('createDecision', async (session) => {
          const { question, recommendation, rationale } = CreateDecisionSchema.parse(decisionData);
          const now = new Date().toISOString();
          const newDecision: Decision = { id: randomUUID(), createdAt: now, updatedAt: now, owner, question, recommendation, rationale };

          const result = await session.run(
              `CREATE (d:Decision $props)
               WITH d
               UNWIND $informedByClaimIds AS claimId
               MATCH (c:Claim {id: claimId, tenantId: $tenantId})
               CREATE (d)-[:INFORMED_BY]->(c)
               RETURN d`,
              { props: { ...newDecision, tenantId }, informedByClaimIds, tenantId }
          );

          const createdDecision = result.records[0]?.get('d').properties as Decision;
          if (!createdDecision) throw new DatabaseError(`Failed to create decision.`);

          await this.ledger.appendEntry({ tenantId, timestamp: new Date(now), actionType: 'CREATE', resourceType: 'Decision', resourceId: createdDecision.id, actorId: owner, actorType: 'user', payload: { question, recommendation, informedByClaimIds }, metadata: {} });
          return createdDecision;
      });
  }

  public static _resetForTesting() {
    IntelGraphService.instance = null;
  }
}
