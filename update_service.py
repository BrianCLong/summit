import re

with open('server/src/marketplace/service.ts') as f:
    content = f.read()

# Imports
import_lines = """
import { verifyCosign } from '../plugins/verify.js';
import { piiDetector } from '../privacy/PIIDetector.js';
import { SubgraphPackage, RegisteredSubgraph, SubgraphStatus } from './types.js';
"""
content = content.replace("import { randomUUID } from 'crypto';", "import { randomUUID } from 'crypto';\n" + import_lines)

# verifySignature
old_verify = """  public verifySignature(pkg: PluginPackage): boolean {
    // Placeholder for cryptographic verification
    return !!pkg.signature;
  }"""

new_verify = """  public async verifySignature(signature: string, payload: any): Promise<boolean> {
    try {
      // Stub payload extraction for cosign logic matching verifyCosign's `ref`
      const ref = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const isValid = await verifyCosign(signature || ref);
      return isValid;
    } catch (error) {
      console.warn('Signature verification failed:', error);
      return false;
    }
  }"""
content = content.replace(old_verify, new_verify)

# Make submitPlugin await verifySignature
old_submit_plugin = """  public async submitPlugin(pkg: PluginPackage, submitter: string): Promise<RegisteredPlugin> {
    // 1. Validate signature (Mock)
    if (!this.verifySignature(pkg)) {
        throw new Error("Invalid plugin signature");
    }"""
new_submit_plugin = """  public async submitPlugin(pkg: PluginPackage, submitter: string): Promise<RegisteredPlugin> {
    // 1. Validate signature
    const isValid = await this.verifySignature(pkg.signature || '', pkg.code);
    if (!isValid) {
        throw new Error("Invalid plugin signature");
    }"""
content = content.replace(old_submit_plugin, new_submit_plugin)


# New Fields
new_fields = """  private _killSwitchActive: boolean = false;
  private subgraphs: Map<string, RegisteredSubgraph> = new Map();
  public contributorReputations: Map<string, number> = new Map();"""
content = content.replace("  private _killSwitchActive: boolean = false;", new_fields)

subgraph_logic = """
  public getReputation(contributorId: string): number {
    return this.contributorReputations.get(contributorId) ?? 100;
  }

  public updateReputation(contributorId: string, delta: number): number {
    const current = this.getReputation(contributorId);
    const updated = Math.max(0, Math.min(100, current + delta));
    this.contributorReputations.set(contributorId, updated);
    return updated;
  }

  public async submitSubgraph(pkg: SubgraphPackage): Promise<RegisteredSubgraph> {
    const reputation = this.getReputation(pkg.contributorId);

    const subgraph: RegisteredSubgraph = {
      id: pkg.id || randomUUID(),
      pkg,
      status: SubgraphStatus.SUBMITTED,
      riskScore: 0,
      reputationScore: reputation,
      createdAt: new Date()
    };

    // 1. Reputation Check
    if (reputation < 50) {
      subgraph.status = SubgraphStatus.QUARANTINED;
      subgraph.quarantineReason = 'Contributor reputation below threshold';
      this.subgraphs.set(subgraph.id, subgraph);
      this.audit(subgraph.id, 'SUBGRAPH_QUARANTINED', { reason: subgraph.quarantineReason });
      return subgraph;
    }

    // 2. Signature Check
    const isValidSig = await this.verifySignature(pkg.signature, pkg.payload);
    if (!isValidSig) {
      subgraph.status = SubgraphStatus.QUARANTINED;
      subgraph.quarantineReason = 'Invalid cryptographic signature';
      this.updateReputation(pkg.contributorId, -10); // Penalty
      this.subgraphs.set(subgraph.id, subgraph);
      this.audit(subgraph.id, 'SUBGRAPH_QUARANTINED', { reason: subgraph.quarantineReason });
      return subgraph;
    }

    // 3. PII Detect
    const scanResultEnvelope = await piiDetector.scanObject(pkg.payload);
    const scanResult = scanResultEnvelope.data;
    if (scanResult.hasPI || scanResult.riskScore > 50) {
      subgraph.status = SubgraphStatus.QUARANTINED;
      subgraph.quarantineReason = `PII Detected (Risk Score: ${scanResult.riskScore})`;
      subgraph.riskScore = scanResult.riskScore;
      this.updateReputation(pkg.contributorId, -5); // Penalty
      this.subgraphs.set(subgraph.id, subgraph);
      this.audit(subgraph.id, 'SUBGRAPH_QUARANTINED', { reason: subgraph.quarantineReason });
      return subgraph;
    }

    // Passed checks
    subgraph.status = SubgraphStatus.APPROVED;
    const updatedRep = this.updateReputation(pkg.contributorId, +2); // Reward for valid submission
    subgraph.reputationScore = updatedRep;
    this.subgraphs.set(subgraph.id, subgraph);
    this.audit(subgraph.id, 'SUBGRAPH_APPROVED', { contributor: pkg.contributorId });

    return subgraph;
  }

  public getSubgraph(id: string): RegisteredSubgraph | undefined {
    return this.subgraphs.get(id);
  }

  public async verifySignature"""

content = content.replace("  public async verifySignature", subgraph_logic)

with open('server/src/marketplace/service.ts', 'w') as f:
    f.write(content)
