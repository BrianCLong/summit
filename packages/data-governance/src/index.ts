/**
 * Summit Data Governance Platform
 *
 * Enterprise data governance with policy management, compliance automation, and privacy controls
 */

export * from './types.js';
export { PolicyEngine } from './policies/policy-engine.js';
export { ComplianceManager } from './compliance/compliance-manager.js';
export { PrivacyManager } from './privacy/privacy-manager.js';

import { Pool } from 'pg';
import { PolicyEngine } from './policies/policy-engine.js';
import { ComplianceManager } from './compliance/compliance-manager.js';
import { PrivacyManager } from './privacy/privacy-manager.js';
import { GovernancePolicy, ComplianceFramework, PrivacyRequest } from './types.js';

export class DataGovernanceEngine {
  private policyEngine: PolicyEngine;
  private complianceManager: ComplianceManager;
  private privacyManager: PrivacyManager;

  constructor(private pool: Pool) {
    this.policyEngine = new PolicyEngine(pool);
    this.complianceManager = new ComplianceManager(pool);
    this.privacyManager = new PrivacyManager(pool);
  }

  async registerPolicy(policy: GovernancePolicy): Promise<void> {
    await this.policyEngine.registerPolicy(policy);
  }

  async evaluateAccess(
    userId: string,
    resource: string,
    action: string,
    context: Record<string, any> = {}
  ) {
    return await this.policyEngine.evaluateAccess(userId, resource, action, context);
  }

  async registerComplianceFramework(framework: ComplianceFramework): Promise<void> {
    await this.complianceManager.registerFramework(framework);
  }

  async assessCompliance(frameworkId: string) {
    return await this.complianceManager.assessCompliance(frameworkId);
  }

  async submitPrivacyRequest(
    type: PrivacyRequest['type'],
    subjectId: string,
    subjectEmail: string,
    details: Record<string, any> = {}
  ) {
    return await this.privacyManager.submitPrivacyRequest(type, subjectId, subjectEmail, details);
  }

  async processErasureRequest(requestId: string): Promise<void> {
    await this.privacyManager.processErasureRequest(requestId);
  }

  // Expose individual components
  getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }

  getComplianceManager(): ComplianceManager {
    return this.complianceManager;
  }

  getPrivacyManager(): PrivacyManager {
    return this.privacyManager;
  }
}
