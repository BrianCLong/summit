/**
 * Document Governance Manager
 *
 * Central orchestrator for document governance operations.
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentTypeDefinition,
  DocumentInstance,
  DocumentSearchQuery,
  DocumentSearchResult,
  ClassificationLevel,
} from '../types/document.js';
import { DocumentRelationship, RelationshipTypeId } from '../types/relationship.js';
import { LifecycleEngine } from './LifecycleEngine.js';
import { RiskScoringService } from './RiskScoringService.js';
import { ComplianceService } from './ComplianceService.js';
import { ProvenanceService } from './ProvenanceService.js';

export interface CreateDocumentInput {
  document_type_id: string;
  title: string;
  description?: string;
  classification: ClassificationLevel;
  owner_id: string;
  owner_department: string;
  effective_date?: string;
  expiration_date?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export class DocumentGovernanceManager {
  private lifecycleEngine: LifecycleEngine;
  private riskScoringService: RiskScoringService;
  private complianceService: ComplianceService;
  private provenanceService: ProvenanceService;

  constructor(private driver: Driver) {
    this.lifecycleEngine = new LifecycleEngine(driver);
    this.riskScoringService = new RiskScoringService(driver);
    this.complianceService = new ComplianceService(driver);
    this.provenanceService = new ProvenanceService(driver);
  }

  /**
   * Get services for direct access
   */
  getLifecycleEngine(): LifecycleEngine {
    return this.lifecycleEngine;
  }

  getRiskScoringService(): RiskScoringService {
    return this.riskScoringService;
  }

  getComplianceService(): ComplianceService {
    return this.complianceService;
  }

  getProvenanceService(): ProvenanceService {
    return this.provenanceService;
  }

  /**
   * Create a new document
   */
  async createDocument(input: CreateDocumentInput, userId: string): Promise<DocumentInstance> {
    const session = this.driver.session();
    try {
      // Get document type to determine lifecycle
      const dtResult = await session.run(
        `
        MATCH (dt:DocumentType {id: $documentTypeId})
        RETURN dt
        `,
        { documentTypeId: input.document_type_id }
      );

      if (dtResult.records.length === 0) {
        throw new Error(`Document type not found: ${input.document_type_id}`);
      }

      const docType = dtResult.records[0].get('dt').properties;
      const lifecycleDef = this.lifecycleEngine.getLifecycleDefinition(docType.lifecycle);

      const now = new Date().toISOString();
      const document: DocumentInstance = {
        id: uuidv4(),
        document_type_id: input.document_type_id,
        title: input.title,
        description: input.description,
        version: '1.0.0',
        status: lifecycleDef.default_state,
        classification: input.classification,
        owner_id: input.owner_id,
        owner_department: input.owner_department,
        created_by: userId,
        created_at: now,
        updated_by: userId,
        updated_at: now,
        effective_date: input.effective_date,
        expiration_date: input.expiration_date,
        tags: input.tags || [],
        metadata: input.metadata || {},
      };

      await session.run(
        `
        CREATE (d:Document {
          id: $id,
          document_type_id: $documentTypeId,
          title: $title,
          description: $description,
          version: $version,
          status: $status,
          classification: $classification,
          owner_id: $ownerId,
          owner_department: $ownerDepartment,
          created_by: $createdBy,
          created_at: datetime($createdAt),
          updated_by: $updatedBy,
          updated_at: datetime($updatedAt),
          effective_date: $effectiveDate,
          expiration_date: $expirationDate,
          tags: $tags,
          metadata: $metadata
        })
        `,
        {
          id: document.id,
          documentTypeId: document.document_type_id,
          title: document.title,
          description: document.description || null,
          version: document.version,
          status: document.status,
          classification: document.classification,
          ownerId: document.owner_id,
          ownerDepartment: document.owner_department,
          createdBy: document.created_by,
          createdAt: document.created_at,
          updatedBy: document.updated_by,
          updatedAt: document.updated_at,
          effectiveDate: document.effective_date || null,
          expirationDate: document.expiration_date || null,
          tags: document.tags,
          metadata: JSON.stringify(document.metadata),
        }
      );

      // Create initial lifecycle history entry
      await session.run(
        `
        CREATE (h:LifecycleHistory {
          id: $historyId,
          document_id: $documentId,
          previous_state: null,
          new_state: $status,
          transition_type: 'automatic',
          triggered_by: $userId,
          triggered_at: datetime(),
          comment: 'Document created'
        })
        `,
        {
          historyId: uuidv4(),
          documentId: document.id,
          status: document.status,
          userId,
        }
      );

      return document;
    } finally {
      await session.close();
    }
  }

  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<DocumentInstance | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (d:Document {id: $documentId})
        RETURN d
        `,
        { documentId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const d = result.records[0].get('d').properties;
      return {
        id: d.id,
        document_type_id: d.document_type_id,
        title: d.title,
        description: d.description,
        version: d.version,
        status: d.status,
        classification: d.classification as ClassificationLevel,
        owner_id: d.owner_id,
        owner_department: d.owner_department,
        created_by: d.created_by,
        created_at: d.created_at.toString(),
        updated_by: d.updated_by,
        updated_at: d.updated_at.toString(),
        effective_date: d.effective_date?.toString(),
        expiration_date: d.expiration_date?.toString(),
        tags: d.tags || [],
        metadata: JSON.parse(d.metadata || '{}'),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query: DocumentSearchQuery): Promise<DocumentSearchResult> {
    const session = this.driver.session();
    try {
      let cypherQuery = `MATCH (d:Document)`;
      const conditions: string[] = [];
      const params: Record<string, any> = {};

      if (query.query) {
        conditions.push(`(d.title CONTAINS $searchQuery OR d.description CONTAINS $searchQuery)`);
        params.searchQuery = query.query;
      }

      if (query.document_type_ids?.length) {
        conditions.push(`d.document_type_id IN $documentTypeIds`);
        params.documentTypeIds = query.document_type_ids;
      }

      if (query.classifications?.length) {
        conditions.push(`d.classification IN $classifications`);
        params.classifications = query.classifications;
      }

      if (query.statuses?.length) {
        conditions.push(`d.status IN $statuses`);
        params.statuses = query.statuses;
      }

      if (query.owner_departments?.length) {
        conditions.push(`d.owner_department IN $ownerDepartments`);
        params.ownerDepartments = query.owner_departments;
      }

      if (conditions.length > 0) {
        cypherQuery += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Count total
      const countResult = await session.run(`${cypherQuery} RETURN count(d) as total`, params);
      const total = countResult.records[0].get('total').toNumber();

      // Get paginated results
      cypherQuery += ` RETURN d ORDER BY d.${query.sort_by} ${query.sort_order.toUpperCase()} SKIP $offset LIMIT $limit`;
      params.offset = query.offset;
      params.limit = query.limit;

      const result = await session.run(cypherQuery, params);

      const documents = result.records.map((record) => {
        const d = record.get('d').properties;
        return {
          id: d.id,
          document_type_id: d.document_type_id,
          title: d.title,
          description: d.description,
          version: d.version,
          status: d.status,
          classification: d.classification as ClassificationLevel,
          owner_id: d.owner_id,
          owner_department: d.owner_department,
          created_by: d.created_by,
          created_at: d.created_at.toString(),
          updated_by: d.updated_by,
          updated_at: d.updated_at.toString(),
          tags: d.tags || [],
          metadata: JSON.parse(d.metadata || '{}'),
        };
      });

      return {
        documents,
        total,
        limit: query.limit,
        offset: query.offset,
        has_more: query.offset + documents.length < total,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Create a relationship between documents
   */
  async createRelationship(
    sourceDocumentId: string,
    targetDocumentId: string,
    relationshipType: RelationshipTypeId,
    userId: string,
    description?: string
  ): Promise<DocumentRelationship> {
    const session = this.driver.session();
    try {
      const relationship: DocumentRelationship = {
        id: uuidv4(),
        relationship_type: relationshipType,
        source_document_id: sourceDocumentId,
        target_document_id: targetDocumentId,
        description,
        created_by: userId,
        created_at: new Date().toISOString(),
        metadata: {},
        is_active: true,
      };

      const relTypeName = relationshipType.replace('rel.', '');

      await session.run(
        `
        MATCH (source:Document {id: $sourceId})
        MATCH (target:Document {id: $targetId})
        CREATE (source)-[r:${relTypeName} {
          id: $relId,
          description: $description,
          created_by: $createdBy,
          created_at: datetime(),
          is_active: true
        }]->(target)
        `,
        {
          sourceId: sourceDocumentId,
          targetId: targetDocumentId,
          relId: relationship.id,
          description: description || null,
          createdBy: userId,
        }
      );

      return relationship;
    } finally {
      await session.close();
    }
  }

  /**
   * Get document relationships
   */
  async getDocumentRelationships(
    documentId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ): Promise<DocumentRelationship[]> {
    const session = this.driver.session();
    try {
      let query: string;
      if (direction === 'outgoing') {
        query = `MATCH (d:Document {id: $documentId})-[r]->(target:Document) RETURN r, d.id as source, target.id as target, type(r) as relType`;
      } else if (direction === 'incoming') {
        query = `MATCH (source:Document)-[r]->(d:Document {id: $documentId}) RETURN r, source.id as source, d.id as target, type(r) as relType`;
      } else {
        query = `
          MATCH (d:Document {id: $documentId})-[r]->(target:Document)
          RETURN r, d.id as source, target.id as target, type(r) as relType
          UNION
          MATCH (source:Document)-[r]->(d:Document {id: $documentId})
          RETURN r, source.id as source, d.id as target, type(r) as relType
        `;
      }

      const result = await session.run(query, { documentId });

      return result.records.map((record) => {
        const r = record.get('r').properties;
        return {
          id: r.id,
          relationship_type: `rel.${record.get('relType')}` as RelationshipTypeId,
          source_document_id: record.get('source'),
          target_document_id: record.get('target'),
          description: r.description,
          created_by: r.created_by,
          created_at: r.created_at.toString(),
          metadata: {},
          is_active: r.is_active,
        };
      });
    } finally {
      await session.close();
    }
  }
}
