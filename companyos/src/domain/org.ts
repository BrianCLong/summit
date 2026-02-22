export interface Organization {
  id: string;
  name: string;
  tenantId: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
