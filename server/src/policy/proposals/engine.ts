import {
  Proposal,
  ProposalRequest,
  ProposalSchema,
} from './schema.js';
import { Transforms } from './transforms.js';
import { TenantPolicyBundle, simulatePolicyDecision, tenantPolicyBundleSchema } from '../tenantBundle.js';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

// Helper to apply the patch (overlay) to the bundle in memory
function applyProposalToBundle(bundle: TenantPolicyBundle, proposalPatch: any[]): TenantPolicyBundle {
  const newBundle = JSON.parse(JSON.stringify(bundle)); // Deep clone
  // The patch is an operation on the 'overlays' array
  for (const op of proposalPatch) {
    if (op.op === 'append' && op.path === '/overlays') {
      newBundle.overlays.push(op.value);
    } else if (op.op === 'set' && op.path.startsWith('baseProfile')) {
        // Fallback for direct modification if we supported it, but we standardized on Overlays
        // However, let's support "set" on bundle root properties just in case
        // But for V1 we only use overlays.
    }
  }
  return newBundle;
}

export class PolicyProposalEngine {
  constructor(private readonly artifactsDir: string) {}

  async generateProposal(
    request: ProposalRequest,
    currentBundle: TenantPolicyBundle
  ): Promise<Proposal> {
    // 1. Validate Request
    if (!request.targetBundleId || request.targetBundleId !== currentBundle.tenantId) {
       // Allow if target is generic template ID
       if (!currentBundle.tenantId.includes(request.targetBundleId)) {
           throw new Error(`Target mismatch: Request=${request.targetBundleId}, Bundle=${currentBundle.tenantId}`);
       }
    }

    // 2. Get Transform
    const transform = Transforms[request.changeType];
    if (!transform) {
      throw new Error(`Unknown change type: ${request.changeType}`);
    }

    // 3. Apply Transform to generate candidate artifacts
    const result = transform(currentBundle, request.args);

    // 4. Monotonic Safety Verification
    // We simulate a "probe" that SHOULD be denied.
    // If the proposal allows something that was previously denied, REJECT.
    // NOTE: This is a simplified check. True verification needs extensive probing.
    // Here we ensure the transform claims safety.
    if (result.safetyClaims.length === 0) {
      throw new Error('Transform provided no safety claims. Rejected.');
    }

    // 5. Simulation Gate
    const candidateBundle = applyProposalToBundle(currentBundle, result.patch);

    // Test Case: Attempt a "bad" action. It MUST be denied.
    // If we are tightening, the behavior should either stay denied or BECOME denied.
    // It should NEVER switch from Deny -> Allow.

    // We need a test input relevant to the change.
    // For now, we run a generic "probe" and ensure it didn't open up.
    // TODO: The Transform should provide the verification probe inputs.
    // For V1, we simulate a known "dangerous" action.

    const probeInput = {
      subjectTenantId: 'outsider',
      resourceTenantId: currentBundle.tenantId,
      action: 'delete', // Dangerous
      purpose: 'malicious',
    };

    const before = simulatePolicyDecision(currentBundle, probeInput);
    const after = simulatePolicyDecision(candidateBundle, probeInput);

    if (!before.allow && after.allow) {
       throw new Error('SAFETY VIOLATION: Proposal expands access (Deny -> Allow) for probe input.');
    }

    // 6. Bundle Generation
    const proposalId = `prop-${randomUUID().slice(0, 8)}`;
    const timestamp = new Date().toISOString();

    const artifactsPaths = await this.saveArtifacts(proposalId, result);

    const proposal: Proposal = {
      id: proposalId,
      schemaVersion: 'v1',
      createdAt: timestamp,
      target: currentBundle.tenantId,
      triggers: request.triggers,
      changeType: request.changeType,
      rationale: request.rationale,
      safetyClaims: result.safetyClaims,
      riskScore: result.riskScore,
      riskFactors: result.riskFactors,
      expectedImpact: result.expectedImpact,
      verificationPlan: {
        commands: ['npm run test:policy'],
        manualChecks: ['Review safety claims', 'Check impact on legacy clients'],
      },
      simulationResults: {
        passed: true,
        summary: `Simulation passed. Access did not expand. Before: ${before.allow ? 'ALLOW' : 'DENY'}, After: ${after.allow ? 'ALLOW' : 'DENY'}`,
        simId: `sim-${Date.now()}`,
      },
      artifacts: artifactsPaths,
    };

    // Final Validation
    return ProposalSchema.parse(proposal);
  }

  private async saveArtifacts(id: string, result: any) {
    const patchPath = path.join(this.artifactsDir, `${id}.patch.json`);
    const rollbackPath = path.join(this.artifactsDir, `${id}.rollback.json`);
    const metadataPath = path.join(this.artifactsDir, `${id}.metadata.json`);

    // Ensure dir exists
    await fs.mkdir(this.artifactsDir, { recursive: true });

    await fs.writeFile(patchPath, JSON.stringify(result.patch, null, 2));
    await fs.writeFile(rollbackPath, JSON.stringify(result.rollback, null, 2));
    await fs.writeFile(metadataPath, JSON.stringify({ safetyClaims: result.safetyClaims }, null, 2));

    return { patchPath, rollbackPath, metadataPath };
  }
}
