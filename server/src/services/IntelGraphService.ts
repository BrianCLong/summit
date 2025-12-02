import { getDriver } from '../graph/neo4j';
import { provenanceLedger } from '../provenance/ledger';
import { dlpService } from './DLPService';
import crypto from 'crypto';
import { Session, Transaction } from 'neo4j-driver';

export interface DecisionData {
  tenantId: string;
  outcome: string;
  rationale: string;
  confidenceScore: number;
  actorId: string;
  classification?: string; // e.g., 'CONFIDENTIAL', 'INTERNAL'
}

export interface ClaimData {
  tenantId: string;
  text: string;
  type: string;
  source?: string;
  classification?: string;
}

export interface IntelGraphReceipt {
  decisionId: string;
  ledgerEntryId: string;
  ledgerEntryHash: string;
  timestamp: Date;
}

export class IntelGraphService {
  /**
   * Creates a Decision node, links it to Claims, and logs to Provenance Ledger.
   * Applies policy labels based on classification.
   * Returns a receipt containing the ledger hash.
   */
  async createDecision(
    decision: DecisionData,
    claimIds: string[],
    evidenceIds: string[] = []
  ): Promise<IntelGraphReceipt> {
    const driver = getDriver();
    const session = driver.session();
    const decisionId = crypto.randomUUID();
    const timestamp = new Date();

    // 0. DLP Scan & Redaction on Rationale
    let rationale = decision.rationale;
    const dlpResult = await dlpService.scanContent(rationale, {
        tenantId: decision.tenantId,
        userId: decision.actorId,
        userRole: 'user',
        operationType: 'write',
        contentType: 'text/plain'
    });

    // If blocked, throw error
    if (dlpResult.some(r => r.recommendedActions.some(a => a.type === 'block'))) {
        throw new Error('DLP Violation: Content blocked');
    }

    // Apply redaction if needed
    if (dlpResult.some(r => r.recommendedActions.some(a => a.type === 'redact'))) {
        const processed = await dlpService.applyActions(rationale, dlpResult, {
            tenantId: decision.tenantId,
            userId: decision.actorId,
            userRole: 'user',
            operationType: 'write',
            contentType: 'text/plain'
        });
        if (typeof processed.processedContent === 'string') {
            rationale = processed.processedContent;
        }
    }

    // 1. Log to Provenance Ledger first to get the hash
    const ledgerEntry = await provenanceLedger.appendEntry({
      tenantId: decision.tenantId,
      actionType: 'CREATE_DECISION',
      resourceType: 'decision',
      resourceId: decisionId,
      actorId: decision.actorId,
      actorType: 'user', // Default to user, could be system/agent
      payload: {
        outcome: decision.outcome,
        rationale: rationale, // Use redacted rationale
        confidenceScore: decision.confidenceScore,
        claimIds,
        evidenceIds
      },
      metadata: {
        classification: decision.classification ? [decision.classification] : ['INTERNAL']
      }
    });

    try {
      await session.executeWrite(async (tx: Transaction) => {
        // 2. Create Decision Node with Policy Labels
        const labels = ['Decision'];
        if (decision.classification) {
            // Sanitize label: allow only alphanumeric and underscore
            if (/^[A-Za-z0-9_]+$/.test(decision.classification)) {
                labels.push(decision.classification);
            } else {
                console.warn(`Invalid classification label: ${decision.classification}`);
            }
        }

        // Base query for Decision node
        const createQuery = `
          CREATE (d:Decision {
            id: $id,
            tenantId: $tenantId,
            outcome: $outcome,
            rationale: $rationale,
            confidenceScore: $confidenceScore,
            ledgerEntryId: $ledgerEntryId,
            ledgerEntryHash: $ledgerEntryHash,
            createdAt: $timestamp
          })
          SET d:${labels.join(':')}
          RETURN d
        `;

        await tx.run(createQuery, {
          id: decisionId,
          tenantId: decision.tenantId,
          outcome: decision.outcome,
          rationale: decision.rationale,
          confidenceScore: decision.confidenceScore,
          ledgerEntryId: ledgerEntry.id,
          ledgerEntryHash: ledgerEntry.currentHash,
          timestamp: timestamp.toISOString()
        });

        // 3. Link to Claims
        if (claimIds.length > 0) {
          const linkClaimsQuery = `
            MATCH (d:Decision {id: $decisionId})
            MATCH (c:Claim {tenantId: $tenantId})
            WHERE c.id IN $claimIds
            MERGE (d)-[:DECIDES]->(c)
          `;
          await tx.run(linkClaimsQuery, {
            decisionId,
            tenantId: decision.tenantId,
            claimIds
          });
        }

        // 4. Link to Evidence
        if (evidenceIds.length > 0) {
          // Assuming Evidence nodes might be generic Entity nodes or specific Evidence nodes
          // Using specific Evidence label for now, falling back to Entity if needed in future
          const linkEvidenceQuery = `
            MATCH (d:Decision {id: $decisionId})
            MATCH (e) WHERE e.id IN $evidenceIds AND e.tenantId = $tenantId
            MERGE (d)-[:BASED_ON]->(e)
          `;
          await tx.run(linkEvidenceQuery, {
            decisionId,
            tenantId: decision.tenantId,
            evidenceIds
          });
        }
      });

      return {
        decisionId,
        ledgerEntryId: ledgerEntry.id,
        ledgerEntryHash: ledgerEntry.currentHash,
        timestamp
      };

    } finally {
      await session.close();
    }
  }

  async createClaim(claim: ClaimData): Promise<string> {
    const driver = getDriver();
    const session = driver.session();
    const claimId = crypto.randomUUID();

    // Log to Ledger
    await provenanceLedger.appendEntry({
      tenantId: claim.tenantId,
      actionType: 'CREATE_CLAIM',
      resourceType: 'claim',
      resourceId: claimId,
      actorId: 'system', // Claims often ingested by system
      actorType: 'system',
      payload: claim,
      metadata: {
        classification: claim.classification ? [claim.classification] : ['INTERNAL']
      }
    });

    try {
      await session.executeWrite(async (tx: Transaction) => {
        const labels = ['Claim'];
        if (claim.classification) {
          labels.push(claim.classification);
        }

        const query = `
          CREATE (c:Claim {
            id: $id,
            tenantId: $tenantId,
            text: $text,
            type: $type,
            source: $source,
            createdAt: $timestamp
          })
          SET c:${labels.join(':')}
        `;

        await tx.run(query, {
          id: claimId,
          tenantId: claim.tenantId,
          text: claim.text,
          type: claim.type,
          source: claim.source || null,
          timestamp: new Date().toISOString()
        });
      });
      return claimId;
    } finally {
      await session.close();
    }
  }

  async getDecisionWithReceipt(decisionId: string): Promise<any> {
    const driver = getDriver();
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (d:Decision {id: $id})
        OPTIONAL MATCH (d)-[:DECIDES]->(c:Claim)
        OPTIONAL MATCH (d)-[:BASED_ON]->(e)
        RETURN d, collect(c) as claims, collect(e) as evidence
      `, { id: decisionId });

      if (result.records.length === 0) return null;

      const record = result.records[0];
      const decision = record.get('d').properties;
      const claims = record.get('claims').map((n: any) => n.properties);
      const evidence = record.get('evidence').map((n: any) => n.properties);

      return {
        ...decision,
        claims,
        evidence,
        // The receipt is effectively the decision node itself which has the ledger hash
        receipt: {
          ledgerEntryId: decision.ledgerEntryId,
          ledgerEntryHash: decision.ledgerEntryHash
        }
      };
    } finally {
      await session.close();
    }
  }
}

export const intelGraphService = new IntelGraphService();
