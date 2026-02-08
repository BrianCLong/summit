export interface Policy {
  id: string;
  tenantId: string;
  version: string;
  rules: any;
  isActive: boolean;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: string;
  definition: string;
  createdAt: Date;
}
