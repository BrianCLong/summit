export interface SubjectAttributes {
  id: string;
  type: string;
  tenant_id: string;
  roles: string[];
  groups: string[];
  attributes: {
    clearance?: string;
    region?: string;
    mfa_verified?: boolean;
    [key: string]: unknown;
  };
}
