export interface Resource {
  type: string;
  id?: string;
  tenant_id?: string;
  residency_region?: string | null;
  [key: string]: unknown;
}

export interface SubjectAttributes {
  [key: string]: any;
  region?: string;
  mfa_verified?: boolean;
}

export interface Subject {
  tenant_id?: string;
  roles?: string[];
  attributes: SubjectAttributes;
  [key: string]: any;
}

export interface AuthzInput {
  subject: Subject;
  resource: Resource;
  action: string;
}

export interface AuthzResult {
  allow: boolean;
  reason?: string;
}
