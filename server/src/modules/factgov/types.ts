export interface Agency {
  id: string;
  name: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  complianceStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Validator {
  id: string;
  name: string;
  accreditationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RFP {
  id: string;
  agencyId: string;
  title: string;
  content: string;
  budgetRange?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Match {
  id: string;
  rfpId: string;
  vendorId: string;
  score?: number;
  matchDetails?: any;
  createdAt: Date;
}

export interface Audit {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  details?: any;
  previousHash?: string;
  hash?: string;
  createdAt: Date;
}
