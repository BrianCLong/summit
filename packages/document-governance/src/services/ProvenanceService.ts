/**
 * AI Provenance Tracking Service
 *
 * Tracks AI-assisted document creation and maintains chain of custody.
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import {
  AIProvenanceMetadata,
  AIAssistSession,
  DataLineageEntry,
  DocumentTransformation,
  ProvenanceQuery,
  ProvenanceReport,
  CreationSource,
} from '../types/provenance.js';

export class ProvenanceService {
  constructor(private driver: Driver) {}

  /**
   * Create provenance metadata for a document
   */
  async createProvenance(
    documentId: string,
    metadata: Omit<AIProvenanceMetadata, 'id' | 'document_id' | 'created_at' | 'updated_at'>
  ): Promise<AIProvenanceMetadata> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const fullMetadata: AIProvenanceMetadata = {
        ...metadata,
        id: uuidv4(),
        document_id: documentId,
        created_at: now,
        updated_at: now,
      };

      await session.run(
        `
        CREATE (p:Provenance {
          id: $id,
          document_id: $documentId,
          created_by: $createdBy,
          ai_model: $aiModel,
          ai_model_version: $aiModelVersion,
          ai_assist_sessions: $aiAssistSessions,
          source_documents: $sourceDocuments,
          source_urls: $sourceUrls,
          retrieval_augmented: $retrievalAugmented,
          rag_sources: $ragSources,
          reviewed_by_human: $reviewedByHuman,
          human_reviewer_id: $humanReviewerId,
          human_reviewer_role: $humanReviewerRole,
          review_timestamp: $reviewTimestamp,
          review_notes: $reviewNotes,
          sign_off_required: $signOffRequired,
          sign_off_obtained: $signOffObtained,
          sign_off_by: $signOffBy,
          sign_off_role: $signOffRole,
          sign_off_timestamp: $signOffTimestamp,
          confidence_score: $confidenceScore,
          accuracy_verified: $accuracyVerified,
          verification_method: $verificationMethod,
          created_at: datetime(),
          updated_at: datetime()
        })
        `,
        {
          id: fullMetadata.id,
          documentId,
          createdBy: fullMetadata.created_by,
          aiModel: fullMetadata.ai_model || null,
          aiModelVersion: fullMetadata.ai_model_version || null,
          aiAssistSessions: JSON.stringify(fullMetadata.ai_assist_sessions),
          sourceDocuments: JSON.stringify(fullMetadata.source_documents),
          sourceUrls: JSON.stringify(fullMetadata.source_urls),
          retrievalAugmented: fullMetadata.retrieval_augmented,
          ragSources: JSON.stringify(fullMetadata.rag_sources),
          reviewedByHuman: fullMetadata.reviewed_by_human,
          humanReviewerId: fullMetadata.human_reviewer_id || null,
          humanReviewerRole: fullMetadata.human_reviewer_role || null,
          reviewTimestamp: fullMetadata.review_timestamp || null,
          reviewNotes: fullMetadata.review_notes || null,
          signOffRequired: fullMetadata.sign_off_required,
          signOffObtained: fullMetadata.sign_off_obtained,
          signOffBy: fullMetadata.sign_off_by || null,
          signOffRole: fullMetadata.sign_off_role || null,
          signOffTimestamp: fullMetadata.sign_off_timestamp || null,
          confidenceScore: fullMetadata.confidence_score || null,
          accuracyVerified: fullMetadata.accuracy_verified,
          verificationMethod: fullMetadata.verification_method || null,
        }
      );

      return fullMetadata;
    } finally {
      await session.close();
    }
  }

  /**
   * Get provenance metadata for a document
   */
  async getProvenance(documentId: string): Promise<AIProvenanceMetadata | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (p:Provenance {document_id: $documentId})
        RETURN p
        `,
        { documentId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const p = result.records[0].get('p').properties;
      return {
        id: p.id,
        document_id: p.document_id,
        created_by: p.created_by as CreationSource,
        ai_model: p.ai_model,
        ai_model_version: p.ai_model_version,
        ai_assist_sessions: JSON.parse(p.ai_assist_sessions || '[]'),
        source_documents: JSON.parse(p.source_documents || '[]'),
        source_urls: JSON.parse(p.source_urls || '[]'),
        retrieval_augmented: p.retrieval_augmented,
        rag_sources: JSON.parse(p.rag_sources || '[]'),
        reviewed_by_human: p.reviewed_by_human,
        human_reviewer_id: p.human_reviewer_id,
        human_reviewer_role: p.human_reviewer_role,
        review_timestamp: p.review_timestamp,
        review_notes: p.review_notes,
        sign_off_required: p.sign_off_required,
        sign_off_obtained: p.sign_off_obtained,
        sign_off_by: p.sign_off_by,
        sign_off_role: p.sign_off_role,
        sign_off_timestamp: p.sign_off_timestamp,
        confidence_score: p.confidence_score,
        accuracy_verified: p.accuracy_verified,
        verification_method: p.verification_method,
        created_at: p.created_at.toString(),
        updated_at: p.updated_at.toString(),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Add an AI assist session to provenance
   */
  async addAIAssistSession(documentId: string, session: AIAssistSession): Promise<void> {
    const dbSession = this.driver.session();
    try {
      await dbSession.run(
        `
        MATCH (p:Provenance {document_id: $documentId})
        SET p.ai_assist_sessions = $sessions,
            p.updated_at = datetime()
        `,
        {
          documentId,
          sessions: JSON.stringify([session]), // In production, would append to existing
        }
      );
    } finally {
      await dbSession.close();
    }
  }

  /**
   * Record human review
   */
  async recordHumanReview(
    documentId: string,
    reviewerId: string,
    reviewerRole: string,
    notes?: string
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (p:Provenance {document_id: $documentId})
        SET p.reviewed_by_human = true,
            p.human_reviewer_id = $reviewerId,
            p.human_reviewer_role = $reviewerRole,
            p.review_timestamp = datetime(),
            p.review_notes = $notes,
            p.updated_at = datetime()
        `,
        { documentId, reviewerId, reviewerRole, notes: notes || null }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Record sign-off
   */
  async recordSignOff(
    documentId: string,
    signOffBy: string,
    signOffRole: string
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (p:Provenance {document_id: $documentId})
        SET p.sign_off_obtained = true,
            p.sign_off_by = $signOffBy,
            p.sign_off_role = $signOffRole,
            p.sign_off_timestamp = datetime(),
            p.updated_at = datetime()
        `,
        { documentId, signOffBy, signOffRole }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Record data lineage
   */
  async recordLineage(entry: Omit<DataLineageEntry, 'id'>): Promise<DataLineageEntry> {
    const session = this.driver.session();
    try {
      const fullEntry: DataLineageEntry = {
        ...entry,
        id: uuidv4(),
      };

      await session.run(
        `
        CREATE (l:DataLineage {
          id: $id,
          document_id: $documentId,
          lineage_type: $lineageType,
          related_document_id: $relatedDocumentId,
          external_source: $externalSource,
          external_destination: $externalDestination,
          operation: $operation,
          performed_by: $performedBy,
          performed_at: datetime(),
          metadata: $metadata
        })
        `,
        {
          id: fullEntry.id,
          documentId: fullEntry.document_id,
          lineageType: fullEntry.lineage_type,
          relatedDocumentId: fullEntry.related_document_id || null,
          externalSource: fullEntry.external_source || null,
          externalDestination: fullEntry.external_destination || null,
          operation: fullEntry.operation,
          performedBy: fullEntry.performed_by,
          metadata: JSON.stringify(fullEntry.metadata || {}),
        }
      );

      return fullEntry;
    } finally {
      await session.close();
    }
  }

  /**
   * Get lineage for a document
   */
  async getLineage(documentId: string): Promise<DataLineageEntry[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (l:DataLineage {document_id: $documentId})
        RETURN l
        ORDER BY l.performed_at DESC
        `,
        { documentId }
      );

      return result.records.map((record) => {
        const l = record.get('l').properties;
        return {
          id: l.id,
          document_id: l.document_id,
          lineage_type: l.lineage_type,
          related_document_id: l.related_document_id,
          external_source: l.external_source,
          external_destination: l.external_destination,
          operation: l.operation,
          performed_by: l.performed_by,
          performed_at: l.performed_at.toString(),
          metadata: JSON.parse(l.metadata || '{}'),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Generate full provenance report
   */
  async generateProvenanceReport(documentId: string): Promise<ProvenanceReport> {
    const session = this.driver.session();
    try {
      // Get document
      const docResult = await session.run(
        `
        MATCH (d:Document {id: $documentId})
        RETURN d.title as title
        `,
        { documentId }
      );

      if (docResult.records.length === 0) {
        throw new Error(`Document not found: ${documentId}`);
      }

      const title = docResult.records[0].get('title');

      // Get provenance
      const provenance = await this.getProvenance(documentId);
      if (!provenance) {
        throw new Error(`Provenance not found for document: ${documentId}`);
      }

      // Get lineage
      const lineage = await this.getLineage(documentId);

      // Get transformations
      const transformResult = await session.run(
        `
        MATCH (t:DocumentTransformation {document_id: $documentId})
        RETURN t
        ORDER BY t.performed_at DESC
        `,
        { documentId }
      );

      const transformations: DocumentTransformation[] = transformResult.records.map((record) => {
        const t = record.get('t').properties;
        return {
          id: t.id,
          document_id: t.document_id,
          transformation_type: t.transformation_type,
          input_format: t.input_format,
          output_format: t.output_format,
          transformation_tool: t.transformation_tool,
          transformation_config: JSON.parse(t.transformation_config || '{}'),
          performed_by: t.performed_by,
          performed_at: t.performed_at.toString(),
          ai_assisted: t.ai_assisted,
          ai_model: t.ai_model,
          quality_score: t.quality_score,
          notes: t.notes,
        };
      });

      // Build chain of custody
      const chainOfCustody: Array<{ action: string; actor: string; timestamp: string; details?: string }> = [];

      chainOfCustody.push({
        action: 'Created',
        actor: provenance.created_by === 'ai' ? `AI (${provenance.ai_model})` : 'Human',
        timestamp: provenance.created_at,
      });

      if (provenance.reviewed_by_human && provenance.review_timestamp) {
        chainOfCustody.push({
          action: 'Reviewed',
          actor: provenance.human_reviewer_id || 'Unknown',
          timestamp: provenance.review_timestamp,
          details: provenance.review_notes,
        });
      }

      if (provenance.sign_off_obtained && provenance.sign_off_timestamp) {
        chainOfCustody.push({
          action: 'Signed Off',
          actor: `${provenance.sign_off_by} (${provenance.sign_off_role})`,
          timestamp: provenance.sign_off_timestamp,
        });
      }

      for (const entry of lineage) {
        chainOfCustody.push({
          action: entry.operation,
          actor: entry.performed_by,
          timestamp: entry.performed_at,
        });
      }

      return {
        document_id: documentId,
        document_title: title,
        provenance,
        lineage,
        transformations,
        chain_of_custody: chainOfCustody.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      };
    } finally {
      await session.close();
    }
  }
}
