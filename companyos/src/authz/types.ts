export interface Subject {
  id: string;
  type: 'human' | 'service';
  tenant_id: string;
  roles: string[];
  groups: string[];
  attributes: {
    clearance: string;
    region: string;
    mfa_verified: boolean;
  };
}

export interface DisclosurePackResource {
  id: string;
  type: 'disclosure_pack';
  name?: string;
  tenant_id: string;
  residency_region: string;
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
}
