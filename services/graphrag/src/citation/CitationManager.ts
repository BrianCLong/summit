/**
 * Citation Manager
 * Manages evidence citations and provenance tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { Driver } from 'neo4j-driver';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { CitationSource, EvidenceChunk, GraphPath } from '../types/index.js';

const tracer = trace.getTracer('graphrag-citation-manager');

export interface CitationLink {
  citationId: string;
  entityId: string;
  relationshipType: string;
  confidence: number;
  spanStart: number;
  spanEnd: number;
}

export interface CitationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProvenanceRecord {
  id: string;
  citationId: string;
  source: string;
  retrievedAt: string;
  verifiedAt?: string;
  verificationMethod?: string;
  chainOfCustody: Array<{
    actor: string;
    action: string;
    timestamp: string;
  }>;
}

export class CitationManager {
  constructor(private driver: Driver) {}

  /**
   * Create a citation linking an entity to a document
   */
  async createCitation(
    entityId: string,
    documentId: string,
    content: string,
    spanStart: number,
    spanEnd: number,
    confidence: number,
    metadata: Record<string, any> = {},
  ): Promise<CitationSource> {
    return tracer.startActiveSpan('create_citation', async (span) => {
      const session = this.driver.session();

      try {
        const citationId = uuidv4();
        const now = new Date().toISOString();

        span.setAttribute('citation.id', citationId);
        span.setAttribute('entity.id', entityId);
        span.setAttribute('document.id', documentId);

        // Create citation node and link to entity
        await session.run(
          `
          MATCH (e {id: $entityId})
          MATCH (d:Document {id: $documentId})
          CREATE (c:Citation {
            id: $citationId,
            content: $content,
            spanStart: $spanStart,
            spanEnd: $spanEnd,
            confidence: $confidence,
            metadata: $metadata,
            createdAt: datetime($now)
          })
          CREATE (e)-[:CITED_IN {confidence: $confidence}]->(c)
          CREATE (c)-[:SOURCES_FROM]->(d)
          RETURN c
          `,
          {
            entityId,
            documentId,
            citationId,
            content,
            spanStart,
            spanEnd,
            confidence,
            metadata: JSON.stringify(metadata),
            now,
          },
        );

        const citation: CitationSource = {
          id: citationId,
          documentId,
          spanStart,
          spanEnd,
          content,
          confidence,
          sourceType: 'document',
          metadata,
        };

        span.setStatus({ code: SpanStatusCode.OK });
        return citation;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        await session.close();
        span.end();
      }
    });
  }

  /**
   * Get all citations for an entity
   */
  async getCitationsForEntity(entityId: string): Promise<CitationSource[]> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (e {id: $entityId})-[:CITED_IN]->(c:Citation)-[:SOURCES_FROM]->(d:Document)
        RETURN c, d.id as documentId, d.title as documentTitle
        ORDER BY c.confidence DESC
        `,
        { entityId },
      );

      return result.records.map((record) => {
        const c = record.get('c').properties;
        return {
          id: c.id,
          documentId: record.get('documentId'),
          documentTitle: record.get('documentTitle'),
          spanStart: c.spanStart,
          spanEnd: c.spanEnd,
          content: c.content,
          confidence: c.confidence,
          sourceType: 'document' as const,
          metadata: JSON.parse(c.metadata || '{}'),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Validate a citation's accuracy
   */
  async validateCitation(citationId: string): Promise<CitationValidation> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (c:Citation {id: $citationId})-[:SOURCES_FROM]->(d:Document)
        RETURN c, d.content as documentContent
        `,
        { citationId },
      );

      if (result.records.length === 0) {
        return {
          isValid: false,
          errors: ['Citation not found'],
          warnings: [],
        };
      }

      const record = result.records[0];
      const citation = record.get('c').properties;
      const documentContent = record.get('documentContent') || '';

      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate span bounds
      if (citation.spanStart < 0 || citation.spanEnd < 0) {
        errors.push('Invalid span bounds: negative values');
      }

      if (citation.spanStart >= citation.spanEnd) {
        errors.push('Invalid span: start must be before end');
      }

      if (citation.spanEnd > documentContent.length) {
        errors.push('Span extends beyond document content');
      }

      // Validate content matches document
      if (documentContent.length > 0) {
        const expectedContent = documentContent.slice(
          citation.spanStart,
          citation.spanEnd,
        );

        if (expectedContent !== citation.content) {
          warnings.push('Citation content does not match document span');
        }
      }

      // Validate confidence
      if (citation.confidence < 0 || citation.confidence > 1) {
        errors.push('Confidence must be between 0 and 1');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Create provenance record for a citation
   */
  async recordProvenance(
    citationId: string,
    source: string,
    actor: string,
  ): Promise<ProvenanceRecord> {
    const session = this.driver.session();

    try {
      const provenanceId = uuidv4();
      const now = new Date().toISOString();

      await session.run(
        `
        MATCH (c:Citation {id: $citationId})
        CREATE (p:Provenance {
          id: $provenanceId,
          source: $source,
          retrievedAt: datetime($now),
          chainOfCustody: $custody
        })
        CREATE (c)-[:HAS_PROVENANCE]->(p)
        RETURN p
        `,
        {
          citationId,
          provenanceId,
          source,
          now,
          custody: JSON.stringify([
            {
              actor,
              action: 'created',
              timestamp: now,
            },
          ]),
        },
      );

      return {
        id: provenanceId,
        citationId,
        source,
        retrievedAt: now,
        chainOfCustody: [
          {
            actor,
            action: 'created',
            timestamp: now,
          },
        ],
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Link citations to graph paths
   */
  async linkCitationsToPath(
    pathId: string,
    citations: CitationSource[],
  ): Promise<void> {
    const session = this.driver.session();

    try {
      for (const citation of citations) {
        await session.run(
          `
          MATCH (c:Citation {id: $citationId})
          MERGE (p:GraphPath {id: $pathId})
          MERGE (p)-[:SUPPORTED_BY {confidence: $confidence}]->(c)
          `,
          {
            citationId: citation.id,
            pathId,
            confidence: citation.confidence,
          },
        );
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Merge duplicate citations
   */
  async mergeCitations(
    primaryId: string,
    duplicateIds: string[],
  ): Promise<CitationSource> {
    const session = this.driver.session();

    try {
      // Move all relationships from duplicates to primary
      await session.run(
        `
        MATCH (primary:Citation {id: $primaryId})
        UNWIND $duplicateIds as dupId
        MATCH (dup:Citation {id: dupId})
        MATCH (dup)<-[r1:CITED_IN]-(e)
        MERGE (e)-[:CITED_IN]->(primary)
        WITH dup, primary
        MATCH (dup)-[r2:SOURCES_FROM]->(d)
        MERGE (primary)-[:SOURCES_FROM]->(d)
        WITH dup
        DETACH DELETE dup
        `,
        { primaryId, duplicateIds },
      );

      // Return updated primary
      const result = await session.run(
        `
        MATCH (c:Citation {id: $primaryId})-[:SOURCES_FROM]->(d:Document)
        RETURN c, d.id as documentId, d.title as documentTitle
        `,
        { primaryId },
      );

      const record = result.records[0];
      const c = record.get('c').properties;

      return {
        id: c.id,
        documentId: record.get('documentId'),
        documentTitle: record.get('documentTitle'),
        spanStart: c.spanStart,
        spanEnd: c.spanEnd,
        content: c.content,
        confidence: c.confidence,
        sourceType: 'document',
        metadata: JSON.parse(c.metadata || '{}'),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get citation statistics for a query result
   */
  async getCitationStats(evidenceChunks: EvidenceChunk[]): Promise<{
    totalCitations: number;
    bySourceType: Record<string, number>;
    averageConfidence: number;
    uniqueDocuments: number;
  }> {
    const allCitations = evidenceChunks.flatMap((c) => c.citations);
    const bySourceType: Record<string, number> = {};
    const documentIds = new Set<string>();
    let totalConfidence = 0;

    for (const citation of allCitations) {
      bySourceType[citation.sourceType] =
        (bySourceType[citation.sourceType] || 0) + 1;
      documentIds.add(citation.documentId);
      totalConfidence += citation.confidence;
    }

    return {
      totalCitations: allCitations.length,
      bySourceType,
      averageConfidence:
        allCitations.length > 0 ? totalConfidence / allCitations.length : 0,
      uniqueDocuments: documentIds.size,
    };
  }

  /**
   * Format citations for display in answers
   */
  formatCitationsForAnswer(citations: CitationSource[]): string {
    if (citations.length === 0) return '';

    const formatted = citations
      .map((c, i) => {
        const title = c.documentTitle || c.documentId;
        return `[${i + 1}] ${title} (confidence: ${(c.confidence * 100).toFixed(0)}%)`;
      })
      .join('\n');

    return `\n\nSources:\n${formatted}`;
  }

  /**
   * Extract inline citation markers from text
   */
  extractCitationMarkers(
    text: string,
  ): Array<{ index: number; position: number }> {
    const markers: Array<{ index: number; position: number }> = [];
    const regex = /\[(\d+)\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      markers.push({
        index: parseInt(match[1], 10),
        position: match.index,
      });
    }

    return markers;
  }
}
