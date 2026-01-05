import {
  getPolicyProfileManifest,
  listPolicyProfileManifests,
} from '../policies/profile-manifests.js';
import { policyProfileAssignmentService } from './policy-profiles/PolicyProfileAssignmentService.js';

export interface PolicyProfileSummary {
  id: string;
  name: string;
  description: string;
  guardrails: {
    requirePurpose: boolean;
    requireJustification: boolean;
  };
  version: string;
  checksum: string;
}

export class PolicyProfileService {
  private static instance: PolicyProfileService;

  private constructor() {}

  public static getInstance(): PolicyProfileService {
    if (!PolicyProfileService.instance) {
      PolicyProfileService.instance = new PolicyProfileService();
    }
    return PolicyProfileService.instance;
  }

  getProfiles(): PolicyProfileSummary[] {
    return listPolicyProfileManifests().map((manifest) => ({
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      guardrails: manifest.baseProfile.guardrails,
      version: manifest.version,
      checksum: manifest.checksum,
    }));
  }

  getProfile(id: string) {
    return getPolicyProfileManifest(id);
  }

  async applyProfile(tenantId: string, profileId: string, actorId: string): Promise<void> {
    await policyProfileAssignmentService.assignProfile({
      tenantId,
      profileId,
      actorId,
      actorType: 'user',
      source: `partner-console:apply-profile:${profileId}`,
    });
  }
}

export const policyProfileService = PolicyProfileService.getInstance();
