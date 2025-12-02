// server/src/services/IntelGraphService.ts
import neo4j, { Driver } from 'neo4j-driver';
import { randomUUID } from 'crypto';
import { getNeo4jDriver } from '../config/database';
import { Entity, Claim, Evidence, PolicyLabel, Decision } from '../graph/schema';
import { AppError } from '../lib/errors';
import { provenanceLedger, ProvenanceLedgerV2 } from '../provenance/ledger';

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
   * Creates a new Entity node in the graph.
   * @param entityData - The data for the new entity.
   * @param owner - The ID of the user or service creating the entity.
   * @param tenantId - The ID of the tenant.
   * @returns The newly created Entity.
   */
  async createEntity(
    entityData: Omit<Entity, keyof import('../graph/schema').BaseNode>,
    owner: string,
    tenantId: string
  ): Promise<Entity> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const newEntity: Entity = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        owner,
        ...entityData,
      };

      const result = await session.run(
        `
        CREATE (e:Entity {
          id: $id,
          name: $name,
          description: $description,
          createdAt: $createdAt,
          updatedAt: $updatedAt,
          owner: $owner,
          tenantId: $tenantId
        })
        RETURN e
      `,
        { ...newEntity, tenantId }
      );

      const createdEntity = result.records[0].get('e').properties as Entity;

      // Audit Log
      await this.ledger.appendEntry({
        tenantId,
        timestamp: new Date(now),
        actionType: 'CREATE',
        resourceType: 'Entity',
        resourceId: createdEntity.id,
        actorId: owner,
        actorType: 'user', // Assuming user for now
        payload: { name: createdEntity.name, description: createdEntity.description },
        metadata: {},
      });

      return createdEntity;
    } finally {
      await session.close();
    }
  }

  /**
   * Creates a new Claim node and links it to an existing Entity.
   * @param claimData - The data for the new claim.
   * @param owner - The ID of the user or service creating the claim.
   * @param tenantId - The ID of the tenant.
   * @returns The newly created Claim.
   */
  async createClaim(
    claimData: Omit<Claim, keyof import('../graph/schema').BaseNode>,
    owner: string,
    tenantId: string
  ): Promise<Claim> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const newClaim: Claim = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        owner,
        ...claimData,
      };

      const result = await session.run(
        `
        MATCH (e:Entity {id: $entityId, tenantId: $tenantId})
        CREATE (c:Claim {
          id: $id,
          statement: $statement,
          confidence: $confidence,
          createdAt: $createdAt,
          updatedAt: $updatedAt,
          owner: $owner,
          tenantId: $tenantId
        })
        CREATE (c)-[:RELATES_TO]->(e)
        RETURN c
      `,
        { ...newClaim, entityId: claimData.entityId, tenantId }
      );

      if (result.records.length === 0) {
        throw new AppError(`Entity with ID ${claimData.entityId} not found for this tenant.`, 404);
      }

      const createdClaim = result.records[0].get('c').properties as Claim;

      // Audit Log
      await this.ledger.appendEntry({
        tenantId,
        timestamp: new Date(now),
        actionType: 'CREATE',
        resourceType: 'Claim',
        resourceId: createdClaim.id,
        actorId: owner,
        actorType: 'user',
        payload: {
          statement: createdClaim.statement,
          confidence: createdClaim.confidence,
          entityId: claimData.entityId,
        },
        metadata: {},
      });

      return createdClaim;
    } finally {
      await session.close();
    }
  }

  /**
   * Attaches a new Evidence node to an existing Claim.
   * @param evidenceData - The data for the new evidence.
   * @param owner - The ID of the user or service.
   * @param tenantId - The ID of the tenant.
   * @returns The newly created Evidence.
   */
  async attachEvidence(
    evidenceData: Omit<Evidence, keyof import('../graph/schema').BaseNode>,
    owner: string,
    tenantId: string
  ): Promise<Evidence> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const newEvidence: Evidence = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        owner,
        ...evidenceData,
      };

      const result = await session.run(
        `
        MATCH (c:Claim {id: $claimId, tenantId: $tenantId})
        CREATE (ev:Evidence {
          id: $id,
          sourceURI: $sourceURI,
          hash: $hash,
          content: $content,
          createdAt: $createdAt,
          updatedAt: $updatedAt,
          owner: $owner,
          tenantId: $tenantId
        })
        CREATE (ev)-[:SUPPORTS]->(c)
        RETURN ev
      `,
        { ...newEvidence, claimId: evidenceData.claimId, tenantId }
      );

      if (result.records.length === 0) {
        throw new AppError(`Claim with ID ${evidenceData.claimId} not found for this tenant.`, 404);
      }

      const attachedEvidence = result.records[0].get('ev').properties as Evidence;

      // Audit Log
      await this.ledger.appendEntry({
        tenantId,
        timestamp: new Date(now),
        actionType: 'ATTACH',
        resourceType: 'Evidence',
        resourceId: attachedEvidence.id,
        actorId: owner,
        actorType: 'user',
        payload: {
          claimId: evidenceData.claimId,
          sourceURI: attachedEvidence.sourceURI,
          hash: attachedEvidence.hash,
        },
        metadata: {},
      });

      return attachedEvidence;
    } finally {
      await session.close();
    }
  }

    /**
   * Attaches a new PolicyLabel node to any other node in the graph.
   * @param policyData - The data for the new policy label.
   * @param targetNodeId - The ID of the node to attach the policy to.
   * @param owner - The ID of the user or service.
   * @param tenantId - The ID of the tenant.
   * @returns The newly created PolicyLabel.
   */
  async tagPolicy(
    policyData: Omit<PolicyLabel, keyof import('../graph/schema').BaseNode>,
    targetNodeId: string,
    owner: string,
    tenantId: string
  ): Promise<PolicyLabel> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const newPolicy: PolicyLabel = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        owner,
        ...policyData,
      };

      const result = await session.run(
        `
        MATCH (n {id: $targetNodeId, tenantId: $tenantId})
        CREATE (p:PolicyLabel {
          id: $id,
          label: $label,
          sensitivity: $sensitivity,
          createdAt: $createdAt,
          updatedAt: $updatedAt,
          owner: $owner,
          tenantId: $tenantId
        })
        CREATE (n)-[:HAS_POLICY]->(p)
        RETURN p
      `,
        { ...newPolicy, targetNodeId, tenantId }
      );

      if (result.records.length === 0) {
        throw new AppError(`Node with ID ${targetNodeId} not found for this tenant.`, 404);
      }

      const taggedPolicy = result.records[0].get('p').properties as PolicyLabel;

      // Audit Log
      await this.ledger.appendEntry({
        tenantId,
        timestamp: new Date(now),
        actionType: 'TAG',
        resourceType: 'PolicyLabel',
        resourceId: taggedPolicy.id,
        actorId: owner,
        actorType: 'user',
        payload: {
          targetNodeId,
          label: taggedPolicy.label,
          sensitivity: taggedPolicy.sensitivity,
        },
        metadata: {},
      });

      return taggedPolicy;
    } finally {
      await session.close();
    }
  }

  /**
   * For testing purposes only.
   * Resets the singleton instance.
   */
  public static _resetForTesting() {
    IntelGraphService.instance = null;
  }

  /**
   * Retrieves the full provenance for a given Decision.
   * This includes the claims that informed the decision and the evidence supporting those claims.
   * @param decisionId - The ID of the Decision.
   * @param tenantId - The ID of the tenant.
   * @returns An object containing the decision and its provenance trail.
   */
  async getDecisionProvenance(decisionId: string, tenantId: string): Promise<any> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (d:Decision {id: $decisionId, tenantId: $tenantId})
        // Use OPTIONAL MATCH in case a decision has no claims yet
        OPTIONAL MATCH (d)-[:INFORMED_BY]->(c:Claim)
        // Use OPTIONAL MATCH in case a claim has no evidence yet
        OPTIONAL MATCH (c)<-[:SUPPORTS]-(ev:Evidence)
        WITH d, c, COLLECT(ev.properties) AS evidences
        WITH d, COLLECT({claim: c.properties, evidences: evidences}) AS claims
        RETURN {decision: d.properties, claims: claims} AS provenance
      `,
        { decisionId, tenantId }
      );

      if (result.records.length === 0 || !result.records[0].get('provenance').decision) {
        throw new AppError(`Decision with ID ${decisionId} not found for this tenant.`, 404);
      }

      return result.records[0].get('provenance');
    } finally {
      await session.close();
    }
  }

  /**
   * Retrieves all claims and their associated policy labels for a given Entity.
   * @param entityId - The ID of the Entity.
   * @param tenantId - The ID of the tenant.
   * @returns An object containing the entity and a list of its claims with policies.
   */
  async getEntityClaims(entityId: string, tenantId: string): Promise<any> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Entity {id: $entityId, tenantId: $tenantId})
        // Use OPTIONAL MATCH in case an entity has no claims
        OPTIONAL MATCH (e)<-[:RELATES_TO]-(c:Claim)
        // Use OPTIONAL MATCH in case a claim has no policy labels
        OPTIONAL MATCH (c)-[:HAS_POLICY]->(p:PolicyLabel)
        WITH e, c, COLLECT(p.properties) AS policies
        WITH e, COLLECT({claim: c.properties, policies: policies}) AS claims
        RETURN {entity: e.properties, claims: claims} AS entityClaims
      `,
        { entityId, tenantId }
      );

      if (result.records.length === 0 || !result.records[0].get('entityClaims').entity) {
        throw new AppError(`Entity with ID ${entityId} not found for this tenant.`, 404);
      }

      return result.records[0].get('entityClaims');
    } finally {
      await session.close();
    }
  }

  /**
   * Creates a new Decision node and links it to the claims that informed it.
   * @param decisionData - The data for the new decision.
   * @param informedByClaimIds - An array of Claim IDs that informed this decision.
   * @param owner - The ID of the user or service.
   * @param tenantId - The ID of the tenant.
   * @returns The newly created Decision.
   */
  async createDecision(
    decisionData: Omit<Decision, keyof import('../../graph/schema').BaseNode>,
    informedByClaimIds: string[],
    owner: string,
    tenantId: string
  ): Promise<Decision> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const newDecision = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        owner,
        ...decisionData,
      };

      const result = await session.run(
        `
        CREATE (d:Decision {
          id: $id,
          question: $question,
          recommendation: $recommendation,
          rationale: $rationale,
          createdAt: $createdAt,
          updatedAt: $updatedAt,
          owner: $owner,
          tenantId: $tenantId
        })
        WITH d
        UNWIND $informedByClaimIds AS claimId
        MATCH (c:Claim {id: claimId, tenantId: $tenantId})
        CREATE (d)-[:INFORMED_BY]->(c)
        RETURN d
      `,
        { ...newDecision, informedByClaimIds, tenantId }
      );

      if (result.records.length === 0) {
        // This could happen if no claims are found, but the decision is still created.
        // A more robust query might handle this better, but for now we'll re-fetch the decision.
        const decisionResult = await session.run(
          'MATCH (d:Decision {id: $id}) RETURN d',
          { id: newDecision.id }
        );
        if (decisionResult.records.length === 0) {
            throw new AppError(`Failed to create or find decision with ID ${newDecision.id}`, 500);
        }
        return decisionResult.records[0].get('d').properties;
      }

      const createdDecision = result.records[0].get('d').properties;

      // Audit Log
      await this.ledger.appendEntry({
        tenantId,
        timestamp: new Date(now),
        actionType: 'CREATE',
        resourceType: 'Decision',
        resourceId: createdDecision.id,
        actorId: owner,
        actorType: 'user',
        payload: {
          question: createdDecision.question,
          recommendation: createdDecision.recommendation,
          informedByClaimIds,
        },
        metadata: {},
      });

      return createdDecision;
    } finally {
      await session.close();
    }
  }
}
