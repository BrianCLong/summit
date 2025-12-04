// src/authz/types.ts

export type SubjectType = "human" | "service";

export interface Subject {
  id: string;
  type: SubjectType;
  tenant_id: string;
  roles: string[];
  groups: string[];
  attributes: {
    clearance?: "internal" | "external";
    region?: string;
    mfa_verified?: boolean;
    [k: string]: unknown;
  };
}

export interface Resource {
  type: string;
  id?: string;
  tenant_id?: string;
  region?: string;
  [k: string]: unknown;
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
