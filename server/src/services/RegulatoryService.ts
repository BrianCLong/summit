import { JurisdictionResolver, JurisdictionContext, JurisdictionDecision } from './JurisdictionResolver.js';
import { PolicyEngine, PolicyContext, PolicyDecision } from './PolicyEngine.js';
import { ProvenanceLedgerService } from './provenance-ledger.js';
import { randomUUID } from 'crypto';

interface EvidenceExportRequest {
  requestId: string;
  jurisdiction: string;
}

interface EvidenceBundle {
  request_id: string;
  jurisdiction: string;
  decision_trace: string;
  model_version: string;
  policy_snapshot: string;
  timestamp: string;
}

export class RegulatoryService {
  private static instance: RegulatoryService;
  private jurisdictionResolver: JurisdictionResolver;
  private policyEngine: PolicyEngine;
  private provenanceLedger: ProvenanceLedgerService;

  private constructor() {
    this.jurisdictionResolver = JurisdictionResolver.getInstance();
    this.policyEngine = PolicyEngine.getInstance();
    this.provenanceLedger = ProvenanceLedgerService.getInstance();
  }

  public static getInstance(): RegulatoryService {
    if (!RegulatoryService.instance) {
      RegulatoryService.instance = new RegulatoryService();
    }
    return RegulatoryService.instance;
  }

  public async evaluateAction(
    action: string,
    userContext: JurisdictionContext['user'],
    resource: any
  ): Promise<{ decision: PolicyDecision; jurisdiction: JurisdictionDecision }> {

    // 1. Resolve Jurisdiction
    const jurisdictionContext: JurisdictionContext = {
      user: userContext,
      region: userContext?.region
    };

    const jurisdiction = this.jurisdictionResolver.resolve(jurisdictionContext);

    // 2. Evaluate Policy
    // We inject jurisdiction info into the resource for policy evaluation if needed
    const policyContext: PolicyContext = {
      environment: process.env.NODE_ENV || 'production',
      user: {
        id: userContext?.id || 'unknown',
        role: userContext?.role || 'user',
        permissions: ['interact_regulator'], // Assuming permissions for demo
        tenantId: userContext?.tenantId || 'global',
        // @ts-ignore
        region: jurisdiction.region
      },
      action,
      resource: {
        ...resource,
        jurisdiction: jurisdiction.region,
        prohibitedFeatures: jurisdiction.prohibitedFeatures
      }
    };

    const decision = await this.policyEngine.evaluate(policyContext);

    // 3. Log Evidence
    if (decision.allow) {
      await this.provenanceLedger.registerClaim({
        content: JSON.stringify({ action, resource, decision }),
        confidence: 1.0,
        evidence_hashes: [],
        created_by: userContext?.id || 'system',
        investigation_id: 'regulatory-audit'
      });
    }

    return { decision, jurisdiction };
  }

  public async exportEvidence(request: EvidenceExportRequest): Promise<EvidenceBundle> {
    // This mocks the export flow described in the prompt
    // Ideally this would fetch from ProvenanceLedger

    // We create a mock bundle matching the schema
    const bundle: EvidenceBundle = {
      request_id: request.requestId,
      jurisdiction: request.jurisdiction,
      decision_trace: 'hash-' + randomUUID(),
      model_version: '1.0.0',
      policy_snapshot: 'git-sha-mock',
      timestamp: new Date().toISOString()
    };

    // In a real implementation, we would call:
    // await this.provenanceLedger.createDisclosureBundle(...)

    return bundle;
  }
}
