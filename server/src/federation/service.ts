import { DeconflictionRequest, DeconflictionResponse, IdentifierType, HashedToken } from './types.js';
import { TokenStore } from './tokens.js';
import { IdentifierHasher } from './hashing.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { randomUUID } from 'crypto';

export class FederationService {
  private static requests: Map<string, DeconflictionRequest> = new Map();

  // Governance: Mock Policy Config
  private static allowedTypes: Map<string, Set<IdentifierType>> = new Map([
    // By default allow EMAIL and PHONE for all
    ['default', new Set([IdentifierType.EMAIL, IdentifierType.PHONE])]
  ]);

  static isTypeAllowed(tenantId: string, type: IdentifierType): boolean {
    const allowed = this.allowedTypes.get(tenantId) || this.allowedTypes.get('default');
    return allowed ? allowed.has(type) : false;
  }

  // Helper for seeding tokens (Ingest simulation)
  static async ingestToken(tenantId: string, value: string, type: IdentifierType, metadata: any = {}): Promise<HashedToken> {
    if (!this.isTypeAllowed(tenantId, type)) {
      throw new Error(`Identifier type ${type} is not allowed for tenant ${tenantId}`);
    }

    const tokenString = IdentifierHasher.hash(value, type, tenantId);
    const token: HashedToken = {
      token: tokenString,
      type,
      tenantId,
      metadata,
      createdAt: new Date()
    };

    TokenStore.addToken(token);

    // Audit the ingestion (creation of hashed token)
    /* await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'TOKEN_INGEST',
      resourceType: 'HashedToken',
      resourceId: tokenString,
      actorId: 'system',
      actorType: 'system',
      payload: { type, metadataStub: true },
      metadata: { purpose: 'ingest' }
    }); */

    return token;
  }

  // Generate hashes for a specific target tenant (Simulates client-side hashing if they had the salt, or trusted server prep)
  static generateHashesForTarget(values: string[], type: IdentifierType, targetTenantId: string): string[] {
    return values.map(v => IdentifierHasher.hash(v, type, targetTenantId));
  }

  static async createDeconflictionRequest(
    requesterTenantId: string,
    targetTenantId: string,
    tokens: string[], // List of hashed tokens (hashed with targetTenantId salt)
    purpose: string,
    actorId: string = 'unknown'
  ): Promise<DeconflictionRequest> {

    if (!purpose) {
      throw new Error("Reason-for-access (purpose) is mandatory.");
    }

    // Policy Check: Are we spamming? (Stub)

    const id = randomUUID();
    const request: DeconflictionRequest = {
      id,
      requesterTenantId,
      targetTenantId,
      purpose,
      tokens,
      status: 'PENDING',
      createdAt: new Date()
    };

    this.requests.set(id, request);

    // Audit the Request Creation
    await provenanceLedger.appendEntry({
      tenantId: requesterTenantId,
      actionType: 'DECONFLICTION_REQUEST',
      resourceType: 'DeconflictionRequest',
      resourceId: id,
      actorId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
        mutationType: 'CREATE',
        entityId: id,
        entityType: 'DeconflictionRequest',
        targetTenantId,
        tokenCount: tokens.length,
        purpose
      },
      metadata: { purpose }
    });

    return request;
  }

  static async processRequest(requestId: string, actorId: string = 'system'): Promise<DeconflictionRequest> {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("Request not found");

    if (request.status !== 'PENDING') return request;

    // Execute Overlap Logic
    const targetTokens = TokenStore.getTokens(request.targetTenantId);
    // Create a Set for O(1) lookup
    const targetTokenSet = new Set(targetTokens.map(t => t.token));

    const matchedTokens: string[] = [];

    for (const token of request.tokens) {
        if (targetTokenSet.has(token)) {
            matchedTokens.push(token);
        }
    }

    const result: DeconflictionResponse = {
        overlapCount: matchedTokens.length,
        matchedTokens,
        metadata: {
            entityCount: matchedTokens.length, // Simplified 1-to-1
            summary: matchedTokens.length > 0 ? 'Overlap Detected' : 'No Overlap'
        },
        timestamp: new Date()
    };

    request.status = 'COMPLETED';
    request.result = result;
    this.requests.set(requestId, request);

    // Audit the Result
    await provenanceLedger.appendEntry({
      tenantId: request.requesterTenantId,
      actionType: 'DECONFLICTION_COMPLETE',
      resourceType: 'DeconflictionRequest',
      resourceId: requestId,
      actorId,
      actorType: 'system',
      timestamp: new Date(),
      payload: {
        mutationType: 'UPDATE',
        entityId: requestId,
        entityType: 'DeconflictionRequest',
        overlapCount: result.overlapCount
      },
      metadata: { purpose: request.purpose }
    });

    return request;
  }

  static getRequest(id: string): DeconflictionRequest | undefined {
      return this.requests.get(id);
  }
}
